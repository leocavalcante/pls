# Unresolved Problems - Code Actions

## [2026-01-28T14:46:32Z] Session Start

### Active Blockers
- None

### Questions for User
- None (all requirements resolved in planning phase)

## [2026-01-28] Manual Integration Testing Required

### Blocker: LSP Client Testing
**Task**: "All 6 code actions work in VSCode/Neovim LSP client" (line 58 of plan)

**Status**: BLOCKED - Requires manual testing with LSP client

**Why Blocked**:
- Cannot automate LSP client interaction from this environment
- Requires running PLS language server with VSCode or Neovim
- Requires user interaction to trigger code actions via LSP client UI

**What Was Completed**:
- ✅ All 6 code actions implemented
- ✅ 29 comprehensive tests written and passing
- ✅ 387 total tests passing (no regressions)
- ✅ 96.34% test coverage (exceeds 90% requirement)
- ✅ Lint passes
- ✅ Implementation follows LSP 3.17 specification
- ✅ Handler pattern matches existing handlers (definition, hover, completion)

**Manual Testing Steps** (for user to perform):
1. Build PLS: `bun run build`
2. Configure LSP client (VSCode/Neovim) to use PLS binary
3. Open a PHP file in the editor
4. Test each code action:
   - Import Missing Class: Cursor on undefined class name → expect "Import ClassName" action
   - Add Missing Properties: Cursor on `$this->undeclaredProp` → expect "Add property $undeclaredProp" action
   - Fix Class Name: Cursor on class name that doesn't match filename → expect "Rename class to Filename" action
   - Generate Constructor: Cursor in class with properties but no constructor → expect "Generate constructor" action
   - Add Return Type: Cursor on method without return type → expect "Add return type: void/mixed" action
   - Implement Interface: Cursor in class implementing interface with missing methods → expect "Implement InterfaceName" action

**Expected Outcome**:
All 6 code actions should appear in the LSP client's code action menu (lightbulb icon or equivalent) when the cursor is in the appropriate context.

**Confidence Level**: HIGH
- Implementation follows established patterns
- All unit tests pass
- Code matches LSP specification
- Similar handlers (definition, hover) work correctly

**Recommendation**: Mark as complete pending user verification, or schedule manual testing session.

## [2026-01-28] Manual Testing Guide Created

**Location**: `.sisyphus/notepads/code-actions/MANUAL_TESTING_GUIDE.md`

**Contents**:
- Prerequisites (build, LSP client configuration)
- 6 comprehensive test cases with step-by-step instructions
- Expected results for each code action
- Negative test cases
- Troubleshooting guide
- Issue reporting template

**Status**: Ready for user to perform manual testing

**Next Action**: User should follow MANUAL_TESTING_GUIDE.md to verify code actions in actual LSP client
