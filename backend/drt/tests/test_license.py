import hashlib
import json
from unittest.mock import MagicMock, patch

from django.core import mail
from django.db.models.signals import post_save
from django.test import SimpleTestCase, TestCase, override_settings
from jinja2.sandbox import SecurityError

from drt.models import NLink, Negotiation
from drt.services.clocks import mark_reopened
from drt.services.license import (
    build_license_context,
    email_issued_license,
    flatten_form_data,
    generate_license_and_notify_owner,
    render_license,
)
from drt.views.stats import generate_summary_statistics


OWNER_EMAIL = "owner@example.com"
REQUESTOR_EMAIL = "requestor@example.com"
LICENSE_BODY = "LICENSE BODY"


class FlattenFormDataTests(SimpleTestCase):
    def test_strips_save_and_submit_flags(self):
        result = flatten_form_data({"name": "Alice", "save": True, "submit": False})
        self.assertEqual(result, {"name": "Alice"})

    def test_normalizes_dotted_field_ids(self):
        result = flatten_form_data({"step1": {"q10.5": "x"}})
        self.assertEqual(result, {"q10_5": "x"})
        self.assertNotIn("5", result)

    def test_namespaced_attributes_get_short_aliases(self):
        submission = {
            "requestor_step": {
                "requestor.name": "Alice",
                "requestor.email": "alice@example.com",
                "requestor.affiliation": "UofG",
                "requestor.location": "Canada",
            },
            "usage_step": {
                "usage.research_question": "Why?",
                "timespan": "12345566",
                "pub_date": "2026-06-02",
            },
        }
        result = flatten_form_data(submission)
        self.assertEqual(result["name"], "Alice")
        self.assertEqual(result["email"], "alice@example.com")
        self.assertEqual(result["affiliation"], "UofG")
        self.assertEqual(result["location"], "Canada")
        self.assertEqual(result["research_question"], "Why?")
        self.assertEqual(result["timespan"], "12345566")
        self.assertEqual(result["requestor_name"], "Alice")

    def test_child_records_get_short_aliases(self):
        submission = {
            "collaborators": {
                "childrenData": {
                    "child_step": [
                        {
                            "id": "1",
                            "data": {
                                "collaborator.name": "Bob",
                                "collaborator.data_access": "full",
                                "collaborator.data_time": "1 year",
                            },
                        },
                    ],
                },
            },
        }
        result = flatten_form_data(submission)
        item = result["collaborators"][0]
        self.assertEqual(item["name"], "Bob")
        self.assertEqual(item["data_access"], "full")
        self.assertEqual(item["data_time"], "1 year")

    def test_single_child_type_uses_parent_reference_key(self):
        submission = {
            "collaborators": {
                "childrenData": {
                    "child_step_abc": [
                        {"id": "1", "data": {"name": "Alice", "affiliation": "UofG"}},
                    ],
                },
            },
        }
        result = flatten_form_data(submission)
        self.assertEqual(result["collaborators"], [{"name": "Alice", "affiliation": "UofG"}])

    def test_multiple_child_types_use_child_step_keys(self):
        submission = {
            "parent_ref": {
                "childrenData": {
                    "child.type.a": [{"id": "1", "data": {"x": 1}}],
                    "child.type.b": [{"id": "2", "data": {"y": 2}}],
                },
            },
        }
        result = flatten_form_data(submission)
        self.assertEqual(result["child_type_a"], [{"x": 1}])
        self.assertEqual(result["child_type_b"], [{"y": 2}])
        self.assertNotIn("parent_ref", result)


class BuildLicenseContextTests(SimpleTestCase):
    def setUp(self):
        self.owner_table = {
            "owner-1": {"owner_email": "owner@example.com", "username": "owner"}
        }
        cache_patch = patch(
            "drt.services.license.cache.get",
            return_value=self.owner_table,
        )
        cache_patch.start()
        self.addCleanup(cache_patch.stop)

    def _nlink(self):
        nlink = MagicMock()
        nlink.data_label = "Dataset"
        nlink.record_label = "Record"
        nlink.visible_label = None
        nlink.tags = []
        nlink.requestor_email = "requestor@example.com"
        nlink.owner_id = "owner-1"
        nlink.license_id = "l-001"
        nlink.link_id = "link-1"
        return nlink

    def test_email_alias_from_nlink_when_not_in_submission(self):
        context = build_license_context(
            submission_data={"name": "Alice"},
            nlink=self._nlink(),
        )

        self.assertEqual(context["dr"]["email"], "requestor@example.com")
        self.assertEqual(context["dr"]["requestor_email"], "requestor@example.com")
        self.assertEqual(context["dr"]["owner_email"], "owner@example.com")
        self.assertNotIn("owner_table", context)

    def test_submission_email_takes_precedence_over_nlink(self):
        context = build_license_context(
            submission_data={"email": "form@example.com"},
            nlink=self._nlink(),
        )

        self.assertEqual(context["dr"]["email"], "form@example.com")


class RenderLicenseTests(SimpleTestCase):
    def test_multi_level_template_renders(self):
        template = {
            "jinja": (
                "{{ dr.name }}, {{ dr.email }}\n"
                "{% for item in collaborators %}"
                "{{ item.name }} - {{ item.affiliation }}\n"
                "{% endfor %}"
            ),
        }
        context = {
            "name": "Alice",
            "dr": {
                "name": "Alice",
                "email": "alice@example.com",
            },
            "collaborators": [
                {"name": "Bob", "affiliation": "UofG"},
            ],
        }
        rendered = render_license(template, context)
        self.assertIn("Alice, alice@example.com", rendered)
        self.assertIn("Bob - UofG", rendered)

    def test_sandbox_blocks_dunder_access(self):
        with self.assertRaises(SecurityError):
            render_license(
                {"jinja": "{{ func.__code__.co_code }}"},
                {"func": lambda: None},
            )


ODRL_JSONLD_JINJA = """{
  "@context": "https://www.w3.org/ns/odrl.jsonld",
  "type": "{{ policy_type }}",
  "permission": [
    {
      "target": "{{ dataset }}",
      "action": "{{ action }}"{% if assigner %},
      "assigner": "{{ assigner }}"{% endif %}{% if constraint_left %},
      "constraint": [
        {
          "leftOperand": "{{ constraint_left }}",
          "operator": "{{ constraint_op }}",
          "rightOperand": "{{ constraint_right }}"
        }
      ]{% endif %}
    }
  ]
}"""


class OdrlJinjaTemplateTests(SimpleTestCase):
    """Proof that questionnaire-shaped answers slot into CODATA-style ODRL JSON-LD."""

    def test_renders_valid_jsonld_with_optional_constraint(self):
        submission = {
            "policy": {
                "policy_type": "Offer",
                "dataset": "https://contexthub.example.org/datasets/92md42wd",
                "action": "read",
                "assigner": "mailto:owner@example.org",
                "constraint_left": "spatial",
                "constraint_op": "eq",
                "constraint_right": (
                    "https://www.geonames.org/countries/CA/canada.html"
                ),
            }
        }
        context = flatten_form_data(submission)
        rendered = render_license({"jinja": ODRL_JSONLD_JINJA}, context)
        policy = json.loads(rendered)

        self.assertEqual(policy["@context"], "https://www.w3.org/ns/odrl.jsonld")
        self.assertEqual(policy["type"], "Offer")
        permission = policy["permission"][0]
        self.assertEqual(
            permission["target"],
            "https://contexthub.example.org/datasets/92md42wd",
        )
        self.assertEqual(permission["action"], "read")
        self.assertEqual(permission["assigner"], "mailto:owner@example.org")
        self.assertEqual(
            permission["constraint"],
            [
                {
                    "leftOperand": "spatial",
                    "operator": "eq",
                    "rightOperand": (
                        "https://www.geonames.org/countries/CA/canada.html"
                    ),
                }
            ],
        )

    def test_omits_optional_fields_when_blank(self):
        submission = {
            "policy": {
                "policy_type": "Agreement",
                "dataset": "urn:drt:link:example",
                "action": "use",
                "assigner": "",
                "constraint_left": "",
                "constraint_op": "",
                "constraint_right": "",
            }
        }
        context = flatten_form_data(submission)
        policy = json.loads(
            render_license({"jinja": ODRL_JSONLD_JINJA}, context)
        )
        permission = policy["permission"][0]
        self.assertEqual(policy["type"], "Agreement")
        self.assertEqual(permission["action"], "use")
        self.assertNotIn("assigner", permission)
        self.assertNotIn("constraint", permission)


ODRL_JSONLD_JINJA_V2 = """{
  "@context": "https://www.w3.org/ns/odrl.jsonld",
  "type": "{{ policy_type }}"{% if description %},
  "dcterms:description": "{{ description }}"{% endif %},
  "permission": [
    {
      "target": "{{ dataset }}",
      "action": "{{ action }}"{% if assigner %},
      "assigner": "{{ assigner }}"{% endif %}{% if purpose %},
      "constraint": [
        {
          "leftOperand": "purpose",
          "operator": "eq",
          "rightOperand": "{{ purpose }}"
        }
      ]{% endif %}
    }
  ]{% if prohibit_action %},
  "prohibition": [
    {
      "target": "{{ dataset }}",
      "action": "{{ prohibit_action }}"{% if prohibit_until %},
      "constraint": [
        {
          "leftOperand": "dateTime",
          "operator": "lt",
          "rightOperand": "{{ prohibit_until }}"
        }
      ]{% endif %}
    }
  ]{% endif %}{% if duty_action %},
  "obligation": [
    {
      "action": "{{ duty_action }}"{% if duty_assignee %},
      "assignee": "{{ duty_assignee }}"{% endif %}
    }
  ]{% endif %}
}"""


class OdrlJinjaTemplateV2Tests(SimpleTestCase):
    """Version 2: 4-tab CODATA studio fields slot into richer ODRL JSON-LD."""

    def test_renders_permission_prohibition_and_obligation(self):
        submission = {
            "policy": {
                "policy_type": "Offer",
                "description": (
                    "Offer to read this dataset for research, "
                    "not commercial redistribution."
                ),
                "dataset": "https://contexthub.example.org/datasets/92md42wd",
                "assigner": "mailto:owner@example.org",
                "action": "read",
                "purpose": "research",
                "prohibit_action": "distribute",
                "prohibit_until": "2028-12-31",
                "duty_action": "attribute",
                "duty_assignee": "mailto:owner@example.org",
            }
        }
        context = flatten_form_data(submission)
        policy = json.loads(
            render_license({"jinja": ODRL_JSONLD_JINJA_V2}, context)
        )

        self.assertEqual(policy["type"], "Offer")
        self.assertEqual(
            policy["dcterms:description"],
            "Offer to read this dataset for research, "
            "not commercial redistribution.",
        )
        permission = policy["permission"][0]
        self.assertEqual(permission["action"], "read")
        self.assertEqual(
            permission["constraint"][0]["rightOperand"],
            "research",
        )
        prohibition = policy["prohibition"][0]
        self.assertEqual(prohibition["action"], "distribute")
        self.assertEqual(
            prohibition["constraint"][0]["rightOperand"],
            "2028-12-31",
        )
        obligation = policy["obligation"][0]
        self.assertEqual(obligation["action"], "attribute")
        self.assertEqual(
            obligation["assignee"],
            "mailto:owner@example.org",
        )

    def test_omits_prohibition_and_obligation_when_blank(self):
        submission = {
            "policy": {
                "policy_type": "Offer",
                "description": "",
                "dataset": "urn:drt:link:example",
                "assigner": "",
                "action": "use",
                "purpose": "",
                "prohibit_action": "",
                "prohibit_until": "",
                "duty_action": "",
                "duty_assignee": "",
            }
        }
        policy = json.loads(
            render_license(
                {"jinja": ODRL_JSONLD_JINJA_V2},
                flatten_form_data(submission),
            )
        )
        permission = policy["permission"][0]
        self.assertEqual(policy["type"], "Offer")
        self.assertNotIn("dcterms:description", policy)
        self.assertEqual(permission["action"], "use")
        self.assertNotIn("assigner", permission)
        self.assertNotIn("constraint", permission)
        self.assertNotIn("prohibition", policy)
        self.assertNotIn("obligation", policy)


ODRL_JSONLD_JINJA_AGREEMENT = """{
  "@context": "https://www.w3.org/ns/odrl.jsonld",
  "type": "Agreement",
  "dcterms:description": "Agreement to read this dataset for research, not commercial redistribution.",
  "permission": [
    {
      "target": "{{ dr.data_label }}",
      "action": "read",
      "assigner": "mailto:{{ dr.owner_email }}",
      "assignee": "mailto:{{ dr.requestor_email }}",
      "constraint": [
        {
          "leftOperand": "purpose",
          "operator": "eq",
          "rightOperand": "research"
        }
      ]
    }
  ],
  "prohibition": [
    {
      "target": "{{ dr.data_label }}",
      "action": "distribute",
      "constraint": [
        {
          "leftOperand": "dateTime",
          "operator": "lt",
          "rightOperand": "{{ end_date }}"
        }
      ]
    }
  ],
  "obligation": [
    {
      "action": "attribute",
      "assignee": "mailto:{{ dr.requestor_email }}"
    }
  ]
}"""


class OdrlAgreementTemplateTests(SimpleTestCase):
    """Canned library Agreement: DRT fills parties; form supplies the end date."""

    def setUp(self):
        owner_table = {
            "owner-1": {
                "owner_email": "owner@example.org",
                "username": "owner",
            }
        }
        cache_patch = patch(
            "drt.services.license.cache.get",
            return_value=owner_table,
        )
        cache_patch.start()
        self.addCleanup(cache_patch.stop)

    def _nlink(self):
        nlink = MagicMock()
        nlink.data_label = "https://contexthub.example.org/datasets/92md42wd"
        nlink.record_label = "Record"
        nlink.visible_label = None
        nlink.tags = []
        nlink.requestor_email = "requestor@example.org"
        nlink.owner_id = "owner-1"
        nlink.license_id = "l-001"
        nlink.link_id = "link-1"
        return nlink

    def test_renders_agreement_from_dr_context_and_end_date(self):
        submission = {
            "in_canada": "yes",
            "for_research": "yes",
            "end_date": "2028-12-31",
        }
        context = build_license_context(
            submission_data=submission,
            nlink=self._nlink(),
        )
        policy = json.loads(
            render_license(
                {"jinja": ODRL_JSONLD_JINJA_AGREEMENT},
                context,
            )
        )

        self.assertEqual(policy["@context"], "https://www.w3.org/ns/odrl.jsonld")
        self.assertEqual(policy["type"], "Agreement")
        permission = policy["permission"][0]
        self.assertEqual(
            permission["target"],
            "https://contexthub.example.org/datasets/92md42wd",
        )
        self.assertEqual(permission["action"], "read")
        self.assertEqual(permission["assigner"], "mailto:owner@example.org")
        self.assertEqual(
            permission["assignee"],
            "mailto:requestor@example.org",
        )
        self.assertEqual(
            permission["constraint"][0]["rightOperand"],
            "research",
        )
        prohibition = policy["prohibition"][0]
        self.assertEqual(prohibition["action"], "distribute")
        self.assertEqual(
            prohibition["constraint"][0]["rightOperand"],
            "2028-12-31",
        )
        obligation = policy["obligation"][0]
        self.assertEqual(obligation["action"], "attribute")
        self.assertEqual(
            obligation["assignee"],
            "mailto:requestor@example.org",
        )


class IssuedLicensePersistTests(TestCase):
    def setUp(self):
        post_save.disconnect(generate_summary_statistics, sender=Negotiation)
        self.addCleanup(
            post_save.connect, generate_summary_statistics, sender=Negotiation
        )

    def _make_case(self):
        negotiation = Negotiation.objects.create(
            questionnaire_SAID="test-said",
            state="accepted",
            requestor_responses={"name": "Alice"},
        )
        nlink = NLink.objects.create(
            negotiation=negotiation,
            owner_id="owner-1",
            license_id="l-001",
            data_label="Dataset",
            record_label="Record",
            visible_label="Visible",
            tags=["2026"],
            requestor_email=REQUESTOR_EMAIL,
        )
        return negotiation, nlink

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"
    )
    @patch("drt.services.license.owner_email_for_nlink", return_value=OWNER_EMAIL)
    @patch("drt.services.license.render_license", return_value=LICENSE_BODY)
    @patch("drt.services.license._load_license_template", return_value="tmpl")
    def test_issue_persists_hash_and_emails_both_parties(
        self, _mock_load, _mock_render, _mock_owner
    ):
        negotiation, nlink = self._make_case()

        generate_license_and_notify_owner(nlink)

        negotiation.refresh_from_db()
        self.assertEqual(negotiation.issued_license_text, LICENSE_BODY)
        self.assertEqual(
            negotiation.issued_license_sha256,
            hashlib.sha256(LICENSE_BODY.encode("utf-8")).hexdigest(),
        )
        self.assertEqual(negotiation.issued_license_version, 1)
        self.assertEqual(negotiation.license_SAID, "l-001")
        self.assertIsNotNone(negotiation.issued_license_at)
        self.assertEqual(
            negotiation.archives.last().change_description, "Issued conditions v1"
        )
        self.assertEqual(len(mail.outbox), 2)
        self.assertCountEqual(
            [message.to[0] for message in mail.outbox],
            [OWNER_EMAIL, REQUESTOR_EMAIL],
        )
        for message in mail.outbox:
            self.assertEqual(message.attachments[0][1], LICENSE_BODY)

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"
    )
    @patch("drt.services.license.owner_email_for_nlink", return_value=OWNER_EMAIL)
    @patch("drt.services.license.render_license", return_value="SECOND BODY")
    @patch("drt.services.license._load_license_template", return_value="tmpl")
    def test_next_accept_overwrites_and_bumps_version(
        self, _mock_load, _mock_render, _mock_owner
    ):
        negotiation, nlink = self._make_case()
        Negotiation.objects.filter(pk=negotiation.pk).update(
            issued_license_text=LICENSE_BODY,
            issued_license_sha256="old",
            issued_license_version=1,
            license_SAID="l-001",
        )
        negotiation.refresh_from_db()

        generate_license_and_notify_owner(nlink)

        negotiation.refresh_from_db()
        self.assertEqual(negotiation.issued_license_text, "SECOND BODY")
        self.assertEqual(negotiation.issued_license_version, 2)
        self.assertEqual(
            negotiation.archives.last().change_description, "Issued conditions v2"
        )

    def test_reopen_leaves_issued_license(self):
        negotiation, _nlink = self._make_case()
        Negotiation.objects.filter(pk=negotiation.pk).update(
            issued_license_text=LICENSE_BODY,
            issued_license_sha256="abc",
            issued_license_version=1,
            license_SAID="l-001",
        )
        negotiation.refresh_from_db()

        self.assertTrue(mark_reopened(negotiation))
        negotiation.refresh_from_db()
        self.assertEqual(negotiation.issued_license_text, LICENSE_BODY)
        self.assertEqual(negotiation.issued_license_sha256, "abc")
        self.assertEqual(negotiation.issued_license_version, 1)
        self.assertEqual(negotiation.license_SAID, "l-001")

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"
    )
    @patch("drt.services.license.owner_email_for_nlink", return_value=OWNER_EMAIL)
    def test_resend_emails_stored_body_without_rerender(self, _mock_owner):
        negotiation, nlink = self._make_case()
        Negotiation.objects.filter(pk=negotiation.pk).update(
            issued_license_text=LICENSE_BODY,
            issued_license_version=1,
        )
        negotiation.refresh_from_db()
        nlink.refresh_from_db()

        with patch("drt.services.license.render_license") as mock_render:
            self.assertTrue(email_issued_license(nlink))
            mock_render.assert_not_called()

        self.assertEqual(len(mail.outbox), 2)
        for message in mail.outbox:
            self.assertEqual(message.attachments[0][1], LICENSE_BODY)

