import json, re, os
outdir=r"c:/Users/pvsat/projects/pro_edova_coteacher_v0/edova-coteacher-v2/_decomp"
raw=open(os.path.join(outdir,"template.txt"),encoding='utf-8').read()
doc=json.loads(raw)  # decode JSON string
open(os.path.join(outdir,"doc.html"),'w',encoding='utf-8').write(doc)
print("doc len", len(doc))
# extract x-dc template markup
mx=re.search(r'<x-dc>(.*?)</x-dc>', doc, re.S)
print("x-dc found:", bool(mx))
# extract data-dc-script content
ms=re.search(r'<script[^>]*data-dc-script[^>]*>(.*?)</script>', doc, re.S)
print("script found:", bool(ms))
if mx:
    open(os.path.join(outdir,"xdc_template.html"),'w',encoding='utf-8').write(mx.group(1))
    print("template markup len", len(mx.group(1)))
if ms:
    open(os.path.join(outdir,"app.js"),'w',encoding='utf-8').write(ms.group(1))
    print("app.js len", len(ms.group(1)))
# show script open tag
i=doc.find('data-dc-script')
print("script tag context:", repr(doc[i-60:i+120]))
