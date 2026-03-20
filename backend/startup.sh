#!/bin/bash

echo "Applying Python 3.10 compatibility patches..."

FROZENDICT_PATH=$(python -c "import frozendict; import os; print(os.path.dirname(frozendict.__file__))" 2>/dev/null || echo "")

if [ -n "$FROZENDICT_PATH" ] && [ -f "$FROZENDICT_PATH/__init__.py" ]; then
    if grep -q "collections.Mapping" "$FROZENDICT_PATH/__init__.py" 2>/dev/null; then
        echo "Patching frozendict for Python 3.10 compatibility..."
        sed -i 's/import collections$/import collections\nimport collections.abc/' "$FROZENDICT_PATH/__init__.py"
        sed -i 's/collections\.Mapping/collections.abc.Mapping/g' "$FROZENDICT_PATH/__init__.py"
        echo "frozendict patched successfully"
    else
        echo "frozendict already patched or compatible version"
    fi
else
    echo "frozendict not found, skipping patch"
fi

echo "Starting application..."
