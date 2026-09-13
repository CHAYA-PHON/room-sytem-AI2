import os
import zipfile
import time

def make_project_zip(output_path='/tmp/sabaidee-dorm-project.zip'):
    if os.path.exists(output_path):
        try:
            os.remove(output_path)
        except Exception:
            pass

    exclude_dirs = {
        'node_modules', '.git', 'dist', '.cache', '__pycache__', '.temp', '.turbo'
    }
    
    root_folder = 'sabaidee-dormitory'
    
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as z:
        # Create root folder entry for Windows compatibility (attribute 0x10)
        z_root = zipfile.ZipInfo(f"{root_folder}/", time.localtime()[:6])
        z_root.external_attr = (0o40755 << 16) | 0x10
        z.writestr(z_root, '')

        # Walk all directories and files
        for root, dirs, files in os.walk('.'):
            dirs[:] = sorted([d for d in dirs if d not in exclude_dirs])
            rel_root = os.path.relpath(root, '.')
            
            if rel_root != '.':
                norm_dir = rel_root.replace('\\', '/')
                d_info = zipfile.ZipInfo(f"{root_folder}/{norm_dir}/", time.localtime()[:6])
                d_info.external_attr = (0o40755 << 16) | 0x10
                z.writestr(d_info, '')
                
            for f in sorted(files):
                if f.endswith('.zip') or f == '.DS_Store':
                    continue
                file_path = os.path.join(root, f)
                rel_path = os.path.relpath(file_path, '.').replace('\\', '/')
                
                with open(file_path, 'rb') as fp:
                    data = fp.read()
                    
                mtime = os.path.getmtime(file_path)
                f_info = zipfile.ZipInfo(f"{root_folder}/{rel_path}", time.localtime(mtime)[:6])
                f_info.external_attr = (0o100644 << 16) | 0x20
                f_info.compress_type = zipfile.ZIP_DEFLATED
                z.writestr(f_info, data)

    return output_path

if __name__ == '__main__':
    out = make_project_zip()
    print(f"Created: {out} ({os.path.getsize(out)} bytes)")
