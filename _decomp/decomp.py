import re, json, gzip, base64, os
f=r"c:/Users/pvsat/projects/pro_edova_coteacher_v0/edova-coteacher-v2/design_handoff_teacher_productivity_platform/design-reference/Teacher Productivity Platform_mockup_v3.html"
data=open(f,encoding='utf-8').read()
m=re.search(r'<script type="__bundler/manifest">\s*(.*?)\s*</script>', data, re.S)
manifest=json.loads(m.group(1))
outdir=r"c:/Users/pvsat/projects/pro_edova_coteacher_v0/edova-coteacher-v2/_decomp"
idx=0
for uuid,entry in manifest.items():
    if entry.get('mime')!='text/javascript':
        idx+=1; continue
    d=entry['data']
    raw=gzip.decompress(base64.b64decode(d)).decode('utf-8','replace') if entry.get('compressed') else d
    open(os.path.join(outdir,f"mod_{idx}.js"),'w',encoding='utf-8').write(raw)
    idx+=1
t=re.search(r'<script type="__bundler/template">\s*(.*?)\s*</script>', data, re.S)
open(os.path.join(outdir,"template.txt"),'w',encoding='utf-8').write(t.group(1))
print("done")
