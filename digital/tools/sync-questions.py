import re, json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
src=(root/'docs/question_bank.reference.h').read_text()
pattern=r'\{"([PKSCB][123])", Shape::(\w+), \d,\s*\{([^}]+)\},\s*\{([^}]+)\},\s*"([^"]+)"\}'
rows=[]
for qid,shape,lines,hints,prompt in re.findall(pattern,src):
    lines=re.findall(r'"([^"]*)"',lines)
    hints=re.findall(r'"([^"]*)"',hints)
    rows.append(dict(id=qid,shape=shape.lower(),lines=lines,prompt=prompt,hint=' '.join(hints).removeprefix('HINT: ')))
assert len(rows)==15
(root/'dist/questions.mjs').write_text('// Generated from the verified firmware bank; see docs/SOURCE.md.\nexport const QUESTIONS = '+json.dumps(rows,ensure_ascii=False,indent=2)+';\n')
print('Generated 15 questions from source snapshot')
