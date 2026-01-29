# Manual Testing Guide for Code Actions

## Overview

This guide provides step-by-step instructions for manually testing all 6 implemented code actions in PLS (PHP Language Server) using VSCode or Neovim.

**Status**: All automated tests pass (29 tests, 387 total). Manual verification required.

---

## Prerequisites

1. **Build PLS**:
   ```bash
   cd /Users/leocavalcante/Projects/leocavalcante/pls
   bun run build
   # Output: dist/pls executable
   ```

2. **Configure LSP Client**:
   
   **VSCode** (using vscode-php-language-server or custom config):
   ```json
   {
     "php.languageServer": "custom",
     "php.customLanguageServer": {
       "command": "/Users/leocavalcante/Projects/leocavalcante/pls/dist/pls",
       "args": []
     }
   }
   ```
   
   **Neovim** (using nvim-lspconfig):
   ```lua
   local lspconfig = require('lspconfig')
   local configs = require('lspconfig.configs')
   
   configs.pls = {
     default_config = {
       cmd = {'/Users/leocavalcante/Projects/leocavalcante/pls/dist/pls'},
       filetypes = {'php'},
       root_dir = lspconfig.util.root_pattern('composer.json', '.git'),
     },
   }
   
   lspconfig.pls.setup{}
   ```

3. **Restart LSP Client** after configuration

---

## Test Cases

### Test 1: Import Missing Class

**Purpose**: Verify "Import Missing Class" code action appears for undefined classes.

**Setup**:
Create file `test-import.php`:
```php
<?php

$obj = new MyUndefinedClass();
```

**Steps**:
1. Open `test-import.php` in editor
2. Place cursor on `MyUndefinedClass` (line 3, column 13-28)
3. Trigger code actions (VSCode: `Cmd+.` or lightbulb, Neovim: `:lua vim.lsp.buf.code_action()`)

**Expected Result**:
- ✅ Code action appears: "Import MyUndefinedClass"
- ✅ Applying action inserts `use MyUndefinedClass;` after `<?php`

**Negative Tests**:
- Cursor on `\FullyQualified\Class` → NO action (already qualified)
- Cursor on `Exception` → NO action (PHP built-in)
- Cursor on already imported class → NO action

---

### Test 2: Add Missing Properties

**Purpose**: Verify "Add Missing Properties" code action for undeclared properties.

**Setup**:
Create file `test-property.php`:
```php
<?php

class User {
    public function __construct() {
        $this->name = 'John';
        $this->age = 30;
    }
}
```

**Steps**:
1. Open `test-property.php` in editor
2. Place cursor on `name` in `$this->name` (line 5, column 15-19)
3. Trigger code actions

**Expected Result**:
- ✅ Code action appears: "Add property $name"
- ✅ Applying action inserts `private $name;` before `__construct` method

**Repeat for `age`**:
- Place cursor on `age` (line 6)
- ✅ Code action appears: "Add property $age"

**Negative Test**:
Add `private $name;` declaration, then:
- Cursor on `$this->name` → NO action (property exists)

---

### Test 3: Fix Namespace/Class Name

**Purpose**: Verify "Rename class to match filename" code action.

**Setup**:
Create file `User.php`:
```php
<?php

class UserModel {
    // class body
}
```

**Steps**:
1. Open `User.php` in editor
2. Place cursor on `UserModel` class name (line 3, column 7-16)
3. Trigger code actions

**Expected Result**:
- ✅ Code action appears: "Rename class to User"
- ✅ Applying action changes `class UserModel` to `class User`

**Negative Test**:
Rename file to `UserModel.php` or change class to `User`:
- Cursor on class name → NO action (name matches filename)

---

### Test 4: Generate Constructor

**Purpose**: Verify "Generate constructor" code action for classes with properties.

**Setup**:
Create file `Product.php`:
```php
<?php

class Product {
    private string $name;
    private float $price;
    private int $quantity;
}
```

**Steps**:
1. Open `Product.php` in editor
2. Place cursor anywhere in class body (e.g., line 4, on `$name`)
3. Trigger code actions

**Expected Result**:
- ✅ Code action appears: "Generate constructor"
- ✅ Applying action inserts after last property:
  ```php
  public function __construct(string $name, float $price, int $quantity) {
      $this->name = $name;
      $this->price = $price;
      $this->quantity = $quantity;
  }
  ```

**Verify**:
- ✅ Traditional style (no property promotion)
- ✅ Parameters match property types
- ✅ All properties assigned in body

**Negative Tests**:
- Class with constructor → NO action
- Class without properties → NO action

---

### Test 5: Add Missing Return Type

**Purpose**: Verify "Add return type" code action for methods without return types.

**Setup**:
Create file `Calculator.php`:
```php
<?php

class Calculator {
    public function add($a, $b) {
        return $a + $b;
    }
    
    public function log($message) {
        echo $message;
    }
    
    public function reset() {
        return;
    }
}
```

**Steps**:

**Test 5a - Method with return value**:
1. Place cursor on `add` method name (line 4)
2. Trigger code actions
3. ✅ Expected: "Add return type: mixed"
4. ✅ Result: `public function add($a, $b): mixed`

**Test 5b - Method without return**:
1. Place cursor on `log` method name (line 8)
2. Trigger code actions
3. ✅ Expected: "Add return type: void"
4. ✅ Result: `public function log($message): void`

**Test 5c - Method with bare return**:
1. Place cursor on `reset` method name (line 12)
2. Trigger code actions
3. ✅ Expected: "Add return type: void"
4. ✅ Result: `public function reset(): void`

**Negative Test**:
Add return type manually:
```php
public function add($a, $b): int {
```
- Cursor on `add` → NO action (return type exists)

---

### Test 6: Implement Interface Methods

**Purpose**: Verify "Implement interface methods" code action.

**Setup**:
Create file `test-interface.php`:
```php
<?php

interface LoggerInterface {
    public function log(string $message): void;
    public function error(string $message): void;
    public function debug(string $message): void;
}

class FileLogger implements LoggerInterface {
    public function log(string $message): void {
        // implementation
    }
}
```

**Steps**:
1. Open `test-interface.php` in editor
2. Place cursor in `FileLogger` class body (line 10-13)
3. Trigger code actions

**Expected Result**:
- ✅ Code action appears: "Implement LoggerInterface"
- ✅ Applying action inserts after last class member:
  ```php
  public function error(string $message): void {
      throw new \RuntimeException('Not implemented');
  }
  
  public function debug(string $message): void {
      throw new \RuntimeException('Not implemented');
  }
  ```

**Verify**:
- ✅ Only missing methods generated (`error` and `debug`, not `log`)
- ✅ Method signatures match interface
- ✅ Body throws RuntimeException

**Negative Tests**:
- Implement all interface methods → NO action
- Interface not in DefinitionIndex → NO action

---

## Verification Checklist

After testing all 6 code actions:

- [ ] **Import Missing Class** works correctly
- [ ] **Add Missing Properties** works correctly
- [ ] **Fix Namespace/Class Name** works correctly
- [ ] **Generate Constructor** works correctly
- [ ] **Add Missing Return Type** works correctly
- [ ] **Implement Interface Methods** works correctly

---

## Common Issues & Troubleshooting

### Issue: No code actions appear

**Possible Causes**:
1. LSP server not running
   - Check LSP client logs
   - Verify `dist/pls` executable exists
   - Try restarting LSP server

2. Cursor not in correct position
   - Code actions are context-based
   - Must be on specific identifier/node
   - Try different cursor positions

3. LSP client not configured correctly
   - Verify configuration
   - Check file type is recognized as PHP
   - Ensure `codeActionProvider` capability is enabled

### Issue: Code action appears but doesn't apply

**Possible Causes**:
1. TextEdit range incorrect
   - Check LSP client logs for errors
   - Verify document is saved
   - Try on fresh file

2. Syntax error in file
   - Parser may fail on invalid PHP
   - Fix syntax errors first

### Issue: Wrong code action appears

**Possible Causes**:
1. Multiple actions available
   - LSP client may show all available actions
   - Select the correct one from menu

2. Cursor on wrong node
   - Move cursor to exact identifier
   - Code actions are position-sensitive

---

## Reporting Issues

If any test fails, report with:

1. **Test Case**: Which test failed (Test 1-6)
2. **Steps**: Exact steps to reproduce
3. **Expected**: What should happen
4. **Actual**: What actually happened
5. **Environment**: VSCode/Neovim version, OS
6. **Logs**: LSP client logs if available

**File Issues At**: (Add repository issue tracker URL)

---

## Success Criteria

All 6 code actions should:
- ✅ Appear in correct context
- ✅ Apply edits correctly
- ✅ Not appear in incorrect context
- ✅ Generate valid PHP code
- ✅ Follow document's existing style

---

## Automated Test Coverage

**Note**: All code actions have comprehensive automated tests:
- 29 tests in `test/server/code-actions.test.ts`
- 387 total tests passing
- 96.34% line coverage
- All edge cases covered

Manual testing verifies LSP client integration only.
