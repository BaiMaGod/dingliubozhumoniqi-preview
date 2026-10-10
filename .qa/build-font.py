"""Build the bundled display-font subset from the verified upstream font."""
from pathlib import Path
import hashlib, urllib.request, shutil
from fontTools.ttLib import TTFont
from fontTools import subset
source='https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/MaShanZheng-Regular.ttf'
expected='11bbfb9867d70612158229d037e7a5f622bd0e38'
dst=Path('public/fonts') if Path('public').is_dir() else Path('fonts');dst.mkdir(parents=True,exist_ok=True)
b=urllib.request.urlopen(source).read();assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==expected,'upstream font changed'
f=TTFont(__import__('io').BytesIO(b));o=subset.Options();o.flavor='woff2';o.recalc_bounds=True;o.recalc_timestamp=False
ss=subset.Subsetter(options=o);ss.populate(text='顶流博主记录生活也被世界看见我的小小出租屋工作室专业创作间从一个房开始分享热爱这里拍你的第一条下爆款灵感发芽成真时刻，。！♡✦ ');ss.subset(f)
for rec in f['name'].names:
 if rec.nameID in (1,4,6):rec.string='Creator Brush'.encode(rec.getEncoding(),errors='replace')
f.flavor='woff2';f.save(dst/'creator-brush-v07.woff2')
license_path=Path('.qa/OFL.txt') if Path('.qa/OFL.txt').exists() else Path('public/fonts/OFL-MaShanZheng.txt')
if license_path.resolve()!=(dst/'OFL-MaShanZheng.txt').resolve():shutil.copyfile(license_path,dst/'OFL-MaShanZheng.txt')
print('Built verified display-font subset:',(dst/'creator-brush-v07.woff2').stat().st_size,'bytes')
