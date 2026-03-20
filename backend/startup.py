#!/usr/bin/env python3
"""
Startup script to patch Python 3.10 compatibility issues in third-party libraries.
Run this before starting the application server.
"""

import sys
import os

def patch_frozendict():
    """Patch frozendict for Python 3.10+ compatibility."""
    try:
        import frozendict
        frozendict_path = os.path.dirname(frozendict.__file__)
        init_file = os.path.join(frozendict_path, '__init__.py')
        
        if not os.path.exists(init_file):
            print("frozendict __init__.py not found, skipping patch")
            return
        
        with open(init_file, 'r') as f:
            content = f.read()
        
        if 'collections.Mapping' in content:
            print("Patching frozendict for Python 3.10 compatibility...")
            content = content.replace('import collections\n', 'import collections\nimport collections.abc\n')
            content = content.replace('collections.Mapping', 'collections.abc.Mapping')
            
            with open(init_file, 'w') as f:
                f.write(content)
            print("frozendict patched successfully")
        elif 'collections.abc.Mapping' in content:
            print("frozendict already patched")
        else:
            print("frozendict already compatible")
            
    except ImportError:
        print("frozendict not installed, skipping patch")
    except Exception as e:
        print(f"Error patching frozendict: {e}")

if __name__ == '__main__':
    print("Applying startup patches...")
    patch_frozendict()
    print("Startup patches complete")
    
    if len(sys.argv) > 1:
        print(f"Executing: {' '.join(sys.argv[1:])}")
        os.system(' '.join(sys.argv[1:]))
