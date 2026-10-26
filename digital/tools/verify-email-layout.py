# Optional offline visual proof; requires WeasyPrint 70.0 and PyMuPDF.
# Run node tools/email-templates.mjs --preview first. This is not a mailbox test.
import json,logging,pathlib
from weasyprint import HTML,CSS
import fitz
logging.getLogger('weasyprint').setLevel(logging.ERROR)
root=pathlib.Path(__file__).resolve().parents[1]
out=root/'docs/auth-email-evidence';out.mkdir(parents=True,exist_ok=True)
cases=[]
def no_network(url,*args,**kwargs):
 raise RuntimeError('Network disabled for email visual fixtures')
for src in sorted((root/'artifacts/email-previews').glob('*.html')):
 if src.name=='index.html':continue
 for width in [320,640]:
  document=HTML(string=src.read_text(),media_type='screen',url_fetcher=no_network).render(stylesheets=[CSS(string=f'@page {{size:{width}px 3000px;margin:0}}')])
  assert len(document.pages)==1,src.name
  page=document.pages[0]
  boxes=list(page._page_box.descendants())
  texts=[b for b in boxes if type(b).__name__=='TextBox']
  overflow=[{'text':b.text,'left':round(b.position_x,2),'right':round(b.position_x+b.width,2)} for b in texts if b.position_x<-.5 or b.position_x+b.width>width+.5]
  assert not overflow,(src.name,width,overflow)
  bottom=max(b.position_y+b.height for b in texts)+44
  cases.append({'fixture':src.name,'width':width,'textOverflow':overflow,'contentBottom':round(bottom),'renderer':'WeasyPrint 70.0; base flexible layout without narrow-screen media query'})
  if src.name in ['confirmation.html','recovery.html','reauthentication.html'] or (width==320 and src.name=='confirmation-long.html'):
   pdf=fitz.open(stream=document.write_pdf(),filetype='pdf')
   clip=fitz.Rect(0,0,width*.75,min(3000,bottom)*.75)
   pdf[0].get_pixmap(matrix=fitz.Matrix(4/3,4/3),clip=clip).save(out/f'{src.stem}-{width}.png')
(out/'layout-checks.json').write_text(json.dumps({'templateVersion':json.loads((root/'backend/email/manifest.json').read_text())['version'],'scope':'Offline HTML rendering only; not Gmail, Outlook, a browser or a delivered message. Base layout checked even when media queries are unavailable.','cases':cases},indent=2)+'\n')
print('Offline visual layout:',len(cases),'cases; no text outside 320px/640px pages.')
