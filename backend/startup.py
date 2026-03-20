#!/usr/bin/env python3
"""
Patch frozendict for Python 3.10+ compatibility.
"""

import os
import sys

def patch_frozendict():
    """Patch frozendict by directly editing the file."""
    # Find frozendict location
    site_packages = [
        '/usr/local/lib/python3.10/site-packages',
        '/usr/lib/python3/dist-packages',
        '/usr/local/lib/python3.10/dist-packages'
    ]
    
    frozendict_init = None
    for sp in site_packages:
        path = os.path.join(sp, 'frozendict', '__init__.py')
        if os.path.exists(path):
            frozendict_init = path
            break
    
    # Also try to find via pip show
    if not frozendict_init:
        import subprocess
        result = subprocess.run([sys.executable, '-m', 'pip', 'show', 'frozendict'], 
                              capture_output=True, text=True)
        for line in result.stdout.split('\n'):
            if line.startswith('Location:'):
                location = line.split(':', 1)[1].strip()
                path = os.path.join(location, 'frozendict', '__init__.py')
                if os.path.exists(path):
                    frozendict_init = path
                    break
    
    if not frozendict_init:
        print("Could not find frozendict, skipping patch")
        return False
    
    with open(frozendict_init, 'r') as f:
        content = f.read()
    
    if 'collections.Mapping' in content:
        print("Patching frozendict for Python 3.10...")
        content = content.replace('import collections\n', 'import collections\nimport collections.abc\n')
        content = content.replace('collections.Mapping', 'collections.abc.Mapping')
        with open(frozendict_init, 'w') as f:
            f.write(content)
        print("frozendict patched successfully")
        return True
    elif 'collections.abc.Mapping' in content:
        print("frozendict already patched")
        return True
    else:
        print("frozendict already compatible")
        return True

if __name__ == '__main__':
    print("Applying frozendict patch...")
    patch_frozendict()
    print("Patch complete")
