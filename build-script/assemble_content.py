import json

d = json.load(open('/home/claude/raw_parsed.json'))
blocks = d['blocks']
bib_items = d['bibliography']
matrix_rows = json.load(open('/home/claude/matrix_final.json'))
domain_refs = json.load(open('/home/claude/domain_table_refs.json'))

MATRIX_COLS = ['MFG', 'PROD', 'PROC', 'RES', 'P.COMP', 'ACTV', 'SHED', 'MAINT', 'SENS', 'ROBT', 'ENG', 'BATCH', 'MSMT', 'STD', 'SIM']
MATRIX_FULLNAMES = {
    'MFG': 'Manufacturing', 'PROD': 'Products', 'PROC': 'Processes', 'RES': 'Resources',
    'P.COMP': 'Plant Components', 'ACTV': 'Activities', 'SHED': 'Scheduling', 'MAINT': 'Maintenance',
    'SENS': 'Sensors', 'ROBT': 'Robotics', 'ENG': 'Engineering', 'BATCH': 'Batch Processing',
    'MSMT': 'Measurements', 'STD': 'Standards', 'SIM': 'Simulation'
}

# Find indices of heading blocks
heading_idxs = [i for i, b in enumerate(blocks) if b['type'] == 'heading']

sections = []
special_ids = {'List of Abbreviations': 'front-abbrev', 'How to use Ontology Design Patterns?': None}

for hi, idx in enumerate(heading_idxs):
    h = blocks[idx]
    end = heading_idxs[hi + 1] if hi + 1 < len(heading_idxs) else len(blocks)
    body = blocks[idx + 1:end]

    number = h['number']
    title_html = h['html']
    level = h['level']

    if number is None:
        # unnumbered heading - derive a slug id
        if title_html in special_ids and special_ids[title_html]:
            sec_id = special_ids[title_html]
        else:
            sec_id = 'sec-' + ''.join(c.lower() if c.isalnum() else '-' for c in title_html).strip('-')
            sec_id = '-'.join(filter(None, sec_id.split('-')))
        display_number = None
    else:
        sec_id = 'sec-' + str(number).replace('.', '-')
        display_number = number

    if title_html == 'Version Control Table':
        title_html = 'Contact'
        sec_id = 'front-contact'
        body = [
            {'type': 'p', 'html': 'In case of questions regarding this guideline, please feel free to contact me.'},
            {'type': 'ul', 'items': [{
                'html': 'Lina Teresa Molinas Comet',
                'blocks': [{'type': 'ul', 'items': [{
                    'html': '<a href="mailto:linamolinascomet@gmail.com" target="_blank" rel="noopener">linamolinascomet@gmail.com</a>',
                    'blocks': []
                }]}]
            }]},
        ]

    # expand bibliography / ontology-matrix placeholders within body
    expanded = []
    trailing_section = None
    for b in body:
        if b['type'] == 'bibliography':
            expanded.append({'type': 'reflist', 'items': bib_items})
        elif b['type'] == 'ontology-matrix':
            expanded.append({
                'type': 'ontology-matrix',
                'columns': [{'key': k, 'full': MATRIX_FULLNAMES[k]} for k in MATRIX_COLS],
                'items': matrix_rows,
                'sourceNote': 'Reconstructed from images/domainontologiestable.pdf in the guideline repository.'
            })
            # this table's reference list is only loosely related to the
            # narrative prose on this page (A.2) - it's its own printed
            # bibliography in the source, so give it its own page too.
            trailing_section = {
                'id': sec_id + '-refs',
                'number': None,
                'title': 'References (Domain Ontologies Catalogue)',
                'level': level,
                'blocks': [{
                    'type': 'reflist',
                    'items': [{'num': it['num'], 'key': f'domtab-{it["num"]}', 'text': it['text'], 'url': it['url']} for it in domain_refs]
                }],
            }
        else:
            expanded.append(b)

    sections.append({
        'id': sec_id,
        'number': display_number,
        'title': title_html,
        'level': level,
        'blocks': expanded,
    })
    if trailing_section:
        sections.append(trailing_section)

# ---------------------------------------------------------------------------
# Interactive fillable templates for Section 6 — replacing the Google Docs
# links with real in-page tools (autosave to the visitor's browser, export
# to CSV/Markdown). Appended after the existing explanatory prose in each
# 6.x subsection, and the section 6 intro is tweaked to describe them.
# ---------------------------------------------------------------------------
TEMPLATE_TOOLS = {
    'sec-6-1': {
        'type': 'template-form',
        'storageKey': 'tmpl:orsd',
        'filenameBase': 'ontology-requirements-specification',
        'fields': [
            {'key': 'purpose', 'label': '1. Purpose', 'placeholder': 'Why is this ontology being built? What need does it address?'},
            {'key': 'scope', 'label': '2. Scope', 'placeholder': 'What is covered, and what is explicitly out of scope?'},
            {'key': 'language', 'label': '3. Implementation Language', 'optional': True, 'placeholder': 'e.g. OWL 2 DL'},
            {'key': 'users', 'label': '4. Intended End-Users', 'optional': True, 'placeholder': 'Who will use this ontology, or systems built on it?'},
            {'key': 'uses', 'label': '5. Intended Uses', 'placeholder': 'What will the ontology be used for in practice?'},
            {'key': 'req_nonfunctional', 'label': 'a. Non-Functional Requirements', 'group': '6. Ontology Requirements', 'placeholder': 'e.g. language, licence, level of formality, expected size…'},
            {'key': 'req_functional', 'label': 'b. Functional Requirements', 'group': '6. Ontology Requirements', 'hint': 'Lists or tables of requirements written as Competency Questions and sentences.', 'placeholder': 'Write requirements as Competency Questions or sentences (see Section 6.2)'},
            {'key': 'glossary_cq', 'label': 'a. Terms from Competency Questions', 'group': '7. Pre-Glossary of Terms', 'optional': True, 'placeholder': 'Terms extracted from your Competency Questions'},
            {'key': 'glossary_answers', 'label': 'b. Terms from Answers', 'group': '7. Pre-Glossary of Terms', 'optional': True, 'placeholder': 'Terms extracted from the Expected Answers'},
            {'key': 'glossary_objects', 'label': 'c. Objects', 'group': '7. Pre-Glossary of Terms', 'optional': True, 'placeholder': 'Objects/entities identified so far'},
        ],
    },
    'sec-6-2': {
        'type': 'template-table',
        'storageKey': 'tmpl:cq',
        'filenameBase': 'competency-questions',
        'columns': [
            {'key': 'id', 'label': 'Identifier', 'placeholder': 'e.g. Short_NUC_CQ_001'},
            {'key': 'question', 'label': 'Competency Question', 'placeholder': 'e.g. What problems do you want to solve with [Name_Use_Case]?'},
            {'key': 'answers', 'label': 'Expected Answers', 'placeholder': 'What should the ontology be able to return?'},
            {'key': 'status', 'label': 'Status', 'type': 'select', 'options': ['', 'Proposed', 'Accepted', 'Rejected', 'Pending', 'Deprecated']},
            {'key': 'suppressedBy', 'label': 'Suppressed by', 'placeholder': 'Identifier that deprecated this CQ'},
            {'key': 'comments', 'label': 'Comments', 'placeholder': 'Additional comments'},
            {'key': 'source', 'label': 'Source', 'placeholder': 'e.g. standard spec, internal requirements doc'},
            {'key': 'priority', 'label': 'Priority', 'type': 'select', 'options': ['', 'High', 'Medium', 'Low']},
            {'key': 'editor', 'label': 'Term Editor', 'placeholder': 'Who defined this?'},
        ],
        'legend': [
            {'term': 'Identifier', 'desc': 'A unique alphanumerical value used to identify a specific competency question, e.g. a short name for the use case, "CQ" (for "Competency Question"), and a consecutive number — [Short_NUC_CQ_001].'},
            {'term': 'Competency Question', 'desc': 'Does the ontology contain enough information to answer these types of questions?'},
            {'term': 'Expected Answers', 'desc': 'The answers the ontology/semantic model should give for the specific competency question.'},
            {'term': 'Status', 'desc': 'The status of the competency question. Possible values are Proposed, Accepted, Rejected, Pending, and Deprecated.'},
            {'term': 'Suppressed by', 'desc': 'In case the status of the competency question has the value "Deprecated", indicate the identifier of the competency question it was deprecated by.'},
            {'term': 'Comments', 'desc': 'Any additional comments regarding the competency question.'},
            {'term': 'Source', 'desc': 'Indicate the document from which the competency question was extracted, e.g. a standard specification, an internal requirements document from the organization, etc.'},
            {'term': 'Priority', 'desc': 'The priority of the competency question. Possible values are High, Medium, and Low.'},
            {'term': 'Term Editor', 'desc': 'The person responsible for defining the property.'},
        ],
        'resources': [
            {'label': 'Ontology Development 101 (Noy & McGuinness)', 'url': 'https://protege.stanford.edu/publications/ontology_development/ontology101-noy-mcguinness.html'},
            {'label': 'Competency Questions — worked examples', 'url': 'https://studentnet.cs.manchester.ac.uk/pgt/2014/COMP60421/slides/Week2-CQ.pdf'},
        ],
    },
    'sec-6-3': {
        'type': 'template-table',
        'storageKey': 'tmpl:class',
        'filenameBase': 'class-definitions',
        'columns': [
            {'key': 'id', 'label': 'Identifier', 'placeholder': 'e.g. Short_NUC_CL_001'},
            {'key': 'name', 'label': 'Class Name', 'placeholder': 'e.g. Machine'},
            {'key': 'label', 'label': 'Label', 'placeholder': 'If it differs from the Class Name'},
            {'key': 'synonym', 'label': 'Synonym', 'placeholder': 'Alternative names for this class'},
            {'key': 'definition', 'label': 'Definition', 'placeholder': 'Meaning of the class'},
            {'key': 'defSource', 'label': 'Definition Source', 'placeholder': 'e.g. a specific standard or manual'},
            {'key': 'example', 'label': 'Example of Usage', 'placeholder': 'A use case where this class is used'},
            {'key': 'parent', 'label': 'Parent Class (Superclass)', 'placeholder': 'e.g. PhysicalObject'},
            {'key': 'child', 'label': 'Child Class (Subclass)', 'placeholder': 'e.g. MachineComponent'},
            {'key': 'equivalent', 'label': 'Equivalent Class', 'placeholder': 'Class with the same extension'},
            {'key': 'disjoint', 'label': 'Disjoint Class', 'placeholder': 'Class with no individuals in common'},
            {'key': 'editor', 'label': 'Term Editor', 'placeholder': 'Who defined this?'},
        ],
        'legend': [
            {'term': 'Identifier', 'desc': 'A unique alphanumerical value used to identify a specific class, e.g. a short name for the use case, "CL" (for "Class"), and a consecutive number — [Short_NUC_CL_001].'},
            {'term': 'Class Name', 'desc': 'The name of the class one is defining.'},
            {'term': 'Label', 'desc': 'The corresponding label, in case it differs from the Class Name.'},
            {'term': 'Synonym', 'desc': 'Alternative names for the same class one is defining.'},
            {'term': 'Definition', 'desc': 'Meaning of the current described class.'},
            {'term': 'Definition Source', 'desc': 'Origin from which the definition comes, for example a specific standard or manual.'},
            {'term': 'Example of Usage', 'desc': 'A use case or function in which the current described class is used.'},
            {'term': 'Parent Class', 'desc': 'Parent class to the current class. It helps to define the hierarchy of classes.'},
            {'term': 'Child Class', 'desc': 'The subclass of the current class. It helps to define the hierarchy of classes.'},
            {'term': 'Equivalent Class', 'desc': 'The two class descriptions involved have the same class extension (i.e., both class extensions contain exactly the same set of individuals).'},
            {'term': 'Disjoint Class', 'desc': 'The class extensions of the two class descriptions involved have no individuals in common.'},
            {'term': 'Term Editor', 'desc': 'The person responsible for defining the class.'},
        ],
        'resources': [
            {'label': 'Class Definition (Step 4)', 'url': 'https://protege.stanford.edu/publications/ontology_development/ontology101.pdf'},
            {'label': 'Parent Class, Child Class relation', 'url': 'http://protegeproject.github.io/protege/views/class-hierarchy/'},
            {'label': 'Equivalent Class, Disjoint Class', 'url': 'http://protegeproject.github.io/protege/views/class-description/'},
        ],
    },
    'sec-6-4': {
        'type': 'template-table',
        'storageKey': 'tmpl:property',
        'filenameBase': 'property-definitions',
        'columns': [
            {'key': 'id', 'label': 'Identifier', 'placeholder': 'e.g. Short_NUC_PR_001'},
            {'key': 'name', 'label': 'Property Name', 'placeholder': 'e.g. hasMachineComponent'},
            {'key': 'type', 'label': 'Property Type', 'type': 'select', 'options': ['', 'DataProperty', 'ObjectProperty']},
            {'key': 'characteristic', 'label': 'Property Characteristic', 'placeholder': 'e.g. Functional, Transitive, Symmetric…'},
            {'key': 'description', 'label': 'Property Description', 'placeholder': 'The logical description of the property'},
            {'key': 'domain', 'label': 'Domain', 'placeholder': 'e.g. Machine'},
            {'key': 'range', 'label': 'Range', 'placeholder': 'e.g. MachineComponent'},
            {'key': 'editor', 'label': 'Term Editor', 'placeholder': 'Who defined this?'},
        ],
        'legend': [
            {'term': 'Property Name', 'desc': 'The name of the property (attribute) belonging to a class(es).'},
            {'term': 'Property Type', 'desc': 'Type of the property, which can be either DataProperty or ObjectProperty.'},
            {'term': 'Property Characteristic', 'desc': 'The asserted characteristics for the property.'},
            {'term': 'Property Description', 'desc': 'The logical description of the property.'},
            {'term': 'Domain', 'desc': 'The class to which the described class, using a given property, belongs.'},
            {'term': 'Range', 'desc': 'The class of the object (value) the described class refers to.'},
            {'term': 'Term Editor', 'desc': 'The person responsible for defining the property.'},
        ],
        'resources': [
            {'label': 'Property/Attribute Definition (Step 5)', 'url': 'https://protege.stanford.edu/publications/ontology_development/ontology101.pdf'},
            {'label': 'Property Characteristic', 'url': 'http://protegeproject.github.io/protege/views/object-property-characteristics/'},
            {'label': 'Property Description', 'url': 'http://protegeproject.github.io/protege/views/object-property-description/'},
            {'label': 'Domain and Range', 'url': 'http://protegeproject.github.io/protege/views/object-property-description/'},
        ],
    },
    'sec-6-5': {
        'type': 'template-table',
        'storageKey': 'tmpl:individuals',
        'filenameBase': 'individuals-definitions',
        'columns': [
            {'key': 'id', 'label': 'Identifier', 'placeholder': 'e.g. Short_NUC_IN_001'},
            {'key': 'name', 'label': 'Individual Name', 'placeholder': 'e.g. Resistor_01'},
            {'key': 'label', 'label': 'Label', 'placeholder': 'If it differs from the Individual Name'},
            {'key': 'instanceOf', 'label': 'Instance of', 'placeholder': 'e.g. Resistor'},
            {'key': 'properties', 'label': 'Properties', 'placeholder': 'Property values for this instance'},
            {'key': 'editor', 'label': 'Term Editor', 'placeholder': 'Who defined this?'},
        ],
        'legend': [
            {'term': 'Identifier', 'desc': 'A unique alphanumerical value used to identify a specific individual, e.g. a short name for the use case, "IN" (for "Individual"), and a consecutive number — [Short_NUC_IN_001].'},
            {'term': 'Individual Name', 'desc': 'The name of the concrete objects in the ontology (machinery, people, unit of measurement, etc.)'},
            {'term': 'Label', 'desc': 'Label assigned to an individual, in case it differs from its name.'},
            {'term': 'Instance of', 'desc': 'Name of the class the individual belongs to.'},
            {'term': 'Properties', 'desc': 'Corresponding properties of this particular instance concerning the class it belongs to.'},
            {'term': 'Term Editor', 'desc': 'The person responsible for defining the property.'},
        ],
        'resources': [
            {'label': 'Creating Individuals', 'url': 'http://protegeproject.github.io/protege/views/instances/'},
            {'label': 'Creating Instances (Step 7)', 'url': 'https://protege.stanford.edu/publications/ontology_development/ontology101.pdf'},
        ],
    },
}

for s in sections:
    tool = TEMPLATE_TOOLS.get(s['id'])
    if tool:
        s['blocks'].append(tool)

for s in sections:
    if s['id'] == 'sec-6':
        for b in s['blocks']:
            if b['type'] == 'p' and 'To download the templates' in b['html']:
                b['html'] = ('Each template below is a small interactive tool built into this page — fill it '
                             'in directly, and it autosaves in your browser as you type. When you\'re done, export '
                             'it as CSV or Markdown to bring into your own ontology project. Nothing is uploaded '
                             'anywhere; it stays on your device unless you export it. If you\'d rather work in the '
                             'original Google Docs/Sheets, they\'re still available in this '
                             '<a href="https://drive.google.com/drive/folders/1xwtJYaNQIGd1TWdWayciCiH5wcpnSDxw?usp=sharing" target="_blank" rel="noopener">Google Drive folder</a>.')

# ---------------------------------------------------------------------------
# "How to Cite" — manually authored, not derived from the LaTeX source.
# Inserted right after the Contact page.
# ---------------------------------------------------------------------------
BIBTEX = """@misc{molinascomet2026semanticmodels,
  author       = {Molinas Comet, Lina Teresa},
  title        = {Guidelines for the Creation of Semantic Models in the {IoP}},
  year         = {2026},
  institution  = {RWTH Aachen University},
  note         = {Originally developed 2022; published as an interactive website in 2026. Internet of Production.},
  url          = {https://lcomet.github.io/semantic-models-iop-website/}
}"""

PLAIN_CITATION = ("Molinas Comet, L. T. (2026). Guidelines for the Creation of Semantic Models "
                   "in the IoP (originally developed 2022). RWTH Aachen University, Internet of Production. "
                   "https://lcomet.github.io/semantic-models-iop-website/")

cite_section = {
    'id': 'front-cite',
    'number': None,
    'title': 'How to Cite',
    'level': 1,
    'blocks': [
        {'type': 'p', 'html': 'If you use this guideline in your own work, please cite it as:'},
        {'type': 'citation', 'bibtex': BIBTEX, 'plain': PLAIN_CITATION},
    ],
}
contact_idx = next((i for i, s in enumerate(sections) if s['id'] == 'front-contact'), None)
if contact_idx is not None:
    sections.insert(contact_idx + 1, cite_section)
else:
    sections.insert(0, cite_section)

json.dump(sections, open('/home/claude/site2/content.json', 'w'), indent=1)
print('wrote', len(sections), 'sections')
for s in sections:
    print(s['id'], '|', s['level'], '|', s['number'], '|', s['title'][:50], '| blocks:', len(s['blocks']))
