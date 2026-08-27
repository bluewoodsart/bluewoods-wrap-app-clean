from pathlib import Path

ADMIN_PATH = Path('src/pages/AdminStatus.tsx')
SKILL_PATH = Path('skills/bwb-portal-evolution/SKILL.md')
WORKFLOW_PATH = Path('.github/workflows/expand-to-full-quote-editor.yml')
SCRIPT_PATH = Path('scripts/expand_quote_editor.py')

admin_text = ADMIN_PATH.read_text(encoding='utf-8')
old_import = "import CustomerInformationEditor from '@/components/admin/CustomerInformationEditor';"
new_import = "import QuoteRecordEditor from '@/components/admin/QuoteRecordEditor';"

if old_import not in admin_text:
    raise RuntimeError('CustomerInformationEditor import was not found.')
admin_text = admin_text.replace(old_import, new_import, 1)

start_marker = '                <CustomerInformationEditor\n'
start = admin_text.find(start_marker)
if start == -1:
    raise RuntimeError('CustomerInformationEditor JSX block was not found.')

end_marker = '                />'
end = admin_text.find(end_marker, start)
if end == -1:
    raise RuntimeError('CustomerInformationEditor JSX closing marker was not found.')
end += len(end_marker)

replacement = '''                <QuoteRecordEditor
                  quote={activeQuote}
                  currentAdminRole={currentAdminRole}
                  onSaved={(updatedQuote) => {
                    setSelectedQuote((currentQuote) =>
                      currentQuote?.id === activeQuote.id
                        ? { ...currentQuote, ...updatedQuote }
                        : currentQuote
                    );
                    setSelectedQuoteDetail((currentQuote) =>
                      currentQuote?.id === activeQuote.id
                        ? { ...currentQuote, ...updatedQuote }
                        : currentQuote
                    );
                    setQuotes((currentQuotes) =>
                      currentQuotes.map((quote) =>
                        quote.id === activeQuote.id
                          ? { ...quote, ...updatedQuote }
                          : quote
                      )
                    );
                    void loadStatusEvents(activeQuote.id);
                  }}
                />'''

admin_text = admin_text[:start] + replacement + admin_text[end:]
ADMIN_PATH.write_text(admin_text, encoding='utf-8')

skill_text = SKILL_PATH.read_text(encoding='utf-8')
skill_section = '''## CRM Quote Record Editing Standard

When an authorized owner or staff user opens a quote inside the protected CRM, **Edit Quote** means editing the existing CRM record—not creating a new quote and not limiting the correction to customer contact information.

The editor must:

- prefill the customer and product-specific quote fields already saved on the record;
- save changes back to the same `quote_requests.id`;
- preserve the quote/order number, product type, uploads, proofs, payments, rep assignment, status, approvals, and production controls unless one of those is changed through its own separate workflow;
- preserve unknown and future `quote_data` keys;
- refresh the open record and CRM list after save;
- record an audit event;
- remain restricted to authenticated owner/staff roles.

Use the detailed implementation module:

```text
skills/bwb-portal-evolution/modules/quote-record-editing.md
```

'''
insertion_marker = '## Data and Integration Gates\n'

if '## CRM Quote Record Editing Standard\n' not in skill_text:
    if insertion_marker not in skill_text:
        raise RuntimeError('SKILL.md insertion marker was not found.')
    skill_text = skill_text.replace(insertion_marker, skill_section + insertion_marker, 1)
    SKILL_PATH.write_text(skill_text, encoding='utf-8')

obsolete_files = [
    Path('src/components/admin/CustomerInformationEditor.tsx'),
    Path('skills/bwb-portal-evolution/modules/customer-information-editing.md'),
    Path('supabase/migrations/20260827190000_admin_customer_information_editing.sql')
]

for obsolete_path in obsolete_files:
    if obsolete_path.exists():
        obsolete_path.unlink()

if WORKFLOW_PATH.exists():
    WORKFLOW_PATH.unlink()

if SCRIPT_PATH.exists():
    SCRIPT_PATH.unlink()
