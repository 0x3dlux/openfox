# Frontend Naming Convention

This document establishes a comprehensive naming convention for the OpenFox frontend to improve code maintainability, accessibility, and testability.

## Overview

The naming convention uses three complementary approaches:

1. **Semantic HTML IDs** - For major component containers and wrappers
2. **Data-testid attributes** - For interactive elements (buttons, inputs, selectors)
3. **Component file naming** - Already established with feature-based organization

## Semantic HTML IDs

### Purpose

- Provide stable, semantic identifiers for major UI regions
- Enable accessibility tools (screen readers, keyboard navigation)
- Facilitate CSS targeting and JavaScript DOM queries
- Create a clear hierarchy of UI components

### Naming Pattern

Use **kebab-case** descriptive names that indicate the component's purpose:

```html
<id>[area]-[component]-[purpose]</id>
```

### Major Layout Components

| Component               | ID                        | Description                           |
| ----------------------- | ------------------------- | ------------------------------------- |
| Header                  | `app-header`              | Top navigation bar                    |
| Sidebar                 | `sidebar-navigation`      | Left sidebar with session list        |
| Session List            | `session-list-panel`      | Container for session items           |
| Session Layout          | `session-layout`          | Main session view wrapper             |
| Session Main Content    | `session-main-content`    | Primary content area                  |
| Criteria Sidebar        | `criteria-sidebar`        | Right sidebar with criteria/workspace |
| Criteria Sidebar Mobile | `criteria-sidebar-mobile` | Mobile version of criteria sidebar    |

### Chat/Plan Components

| Component              | ID                        | Description                       |
| ---------------------- | ------------------------- | --------------------------------- |
| Plan Panel             | `plan-panel-main`         | Main chat interface container     |
| Chat Scroll Container  | `chat-scroll-container`   | Scrollable message area           |
| Chat Input Form        | `chat-input-form`         | Message input form                |
| Chat Input Container   | `chat-input-container`    | Input wrapper with styling        |
| Chat Input Controls    | `chat-input-controls`     | Top-right control buttons         |
| Chat Input Attachments | `chat-input-attachments`  | Attached files preview area       |
| Chat Input Selectors   | `chat-input-selectors`    | Agent/danger level selectors      |
| Send Command Menu      | `send-command-menu`       | Popup menu for commands/workflows |
| Message List           | `message-list-container`  | Container for chat messages       |
| Assistant Message      | `assistant-message-block` | AI response container             |
| User Message           | `user-message-block`      | User message container            |

### Session Components

| Component            | ID                           | Description                   |
| -------------------- | ---------------------------- | ----------------------------- |
| Session Sidebar      | `session-sidebar`            | Right sidebar in session view |
| Criteria Editor      | `criteria-editor-panel`      | Task criteria editor          |
| Diff Viewer          | `diff-viewer-container`      | Code diff display             |
| Workspace Panel      | `workspace-panel`            | Workspace file browser        |
| Background Processes | `background-processes-panel` | Running processes display     |
| Dev Server Footer    | `dev-server-footer`          | Dev server status footer      |

### Settings & Modals

| Component            | ID                     | Description                     |
| -------------------- | ---------------------- | ------------------------------- |
| Settings Modal       | `settings-modal`       | Main settings window            |
| Commands Modal       | `commands-modal`       | Commands management             |
| Workflows Modal      | `workflows-modal`      | Workflow editor                 |
| Workspace Modal      | `workspace-modal`      | Workspace selection             |
| Branch Modal         | `branch-modal`         | Git branch selection            |
| Stats Modal          | `stats-modal`          | Session statistics              |
| Message Search Modal | `message-search-modal` | Message search interface        |
| Theme Editor         | `theme-editor`         | Theme customization panel       |
| Provider Selector    | `provider-selector`    | LLM provider selection          |
| Instructions Panel   | `instructions-panel`   | Custom instructions editor      |
| Tools Panel          | `tools-panel`          | Tool configuration              |
| Skills Panel         | `skills-panel`         | Skills management               |
| Plugins Panel        | `plugins-panel`        | Plugin settings                 |
| Notifications Panel  | `notifications-panel`  | Notification preferences        |
| Display Panel        | `display-panel`        | Display settings                |
| Keybindings Panel    | `keybindings-panel`    | Keyboard shortcut configuration |
| Advanced Panel       | `advanced-panel`       | Advanced settings               |

### Terminal Components

| Component       | ID                | Description                  |
| --------------- | ----------------- | ---------------------------- |
| Terminal Drawer | `terminal-drawer` | Terminal container           |
| Terminal Pane   | `terminal-pane`   | Individual terminal instance |
| Terminal List   | `terminal-list`   | List of open terminals       |

### Shared Components

| Component         | ID                  | Description           |
| ----------------- | ------------------- | --------------------- |
| Modal Shell       | `modal-shell`       | Generic modal wrapper |
| Confirm Modal     | `confirm-modal`     | Confirmation dialog   |
| Tooltip Container | `tooltip-container` | Tooltip wrapper       |
| Dropdown Menu     | `dropdown-menu`     | Dropdown container    |
| Context Menu      | `context-menu`      | Right-click menu      |
| Portal Container  | `portal-container`  | React portal wrapper  |

### Onboarding

| Component            | ID                     | Description              |
| -------------------- | ---------------------- | ------------------------ |
| Onboarding Wizard    | `onboarding-wizard`    | First-time user setup    |
| Step Indicator       | `step-indicator`       | Progress indicator       |
| Connect LLM Step     | `connect-llm-step`     | LLM configuration step   |
| Projects Folder Step | `projects-folder-step` | Project setup step       |
| Vision Step          | `vision-step`          | Vision/OCR configuration |

## Data-testid Attributes

### Purpose

- Provide stable selectors for automated testing (Vitest, Playwright)
- Enable component testing without relying on implementation details
- Support accessibility testing

### Naming Pattern

Use **double-dash separator** to denote hierarchy:

```html
<data-testid>[feature]--[element]--[purpose]</data-testid>
```

### Examples

```html
<!-- Header buttons -->
<button data-testid="header--menu-button">
<button data-testid="header--settings-button">
<button data-testid="header--logout-button">
<button data-testid="header--fullscreen-toggle">
<button data-testid="header--terminal-toggle">
<button data-testid="header--criteria-toggle">

<!-- Sidebar -->
<button data-testid="sidebar--new-session-button">
<button data-testid="sidebar--options-button">
<div data-testid="session-item">
<span data-testid="session-item--title">

<!-- Chat Input -->
<button data-testid="chat-input--send-button">
<button data-testid="chat-input--abort-button">
<button data-testid="chat-input--more-menu-button">
<button data-testid="chat-input--browse-history-button">
<textarea data-testid="chat-input--textarea">
<div data-testid="chat-input--error-message">
<div data-testid="chat-input--history-list">

<!-- Send Command Menu -->
<div id="send-command-menu">
<button data-testid="send-command-menu--commands-tab">
<button data-testid="send-command-menu--workflows-tab">
<button data-testid="send-command-menu--attach-tab">
<input data-testid="send-command-menu--search-input">
<div data-testid="send-command-menu--command-item">
<div data-testid="send-command-menu--workflow-item">
<button data-testid="send-command-menu--attach-button">

<!-- Modals -->
<button data-testid="settings-modal--save-button">
<button data-testid="commands-modal--create-button">
<button data-testid="workflows-modal--save-button">

<!-- Message List -->
<div data-testid="message-list--item">
<button data-testid="message--copy-button">
<button data-testid="message--regenerate-button">
```

## Guidelines

### When to Use Semantic IDs

1. **Major containers** - Wrappers that define UI regions
2. **Interactive panels** - Sidebars, drawers, modals
3. **Complex components** - Multi-part interfaces like chat input
4. **Navigation elements** - Headers, menus, tabs

### When to Use Data-testid

1. **Interactive elements** - Buttons, inputs, selects
2. **List items** - Repeated elements that need testing
3. **Form fields** - Input fields with specific purposes
4. **Toggle controls** - Switches, checkboxes, radio buttons

### What NOT to Do

❌ **Don't use IDs for styling** - Use Tailwind classes instead
❌ **Don't overuse IDs** - Only add when there's a clear purpose
❌ **Don't use camelCase** - Always use kebab-case for IDs
❌ **Don't use generic names** - Be specific (e.g., `chat-input--send-button` not `button-1`)
❌ **Don't duplicate IDs** - Each ID must be unique in the DOM

## Migration Checklist

- [x] Layout components (Header, Sidebar, SessionLayout)
- [x] Chat components (ChatInput, MoreMenu, PlanPanel)
- [ ] Message components (ChatMessage, AssistantMessage, MessageList)
- [ ] Settings components (GlobalSettingsModal, all tabs)
- [ ] Modal components (all modals)
- [ ] Terminal components
- [ ] Onboarding components
- [ ] Shared components (Modal, Dropdown, Tooltip, etc.)
- [ ] Add data-testid to all interactive elements
- [ ] Update existing tests to use new selectors
- [ ] Document any component-specific conventions

## Testing Integration

### Vitest Component Tests

```typescript
// Example: Testing chat input
const sendButton = screen.getByTestId('chat-input--send-button')
await userEvent.click(sendButton)

const errorElement = screen.getByTestId('chat-input--error-message')
expect(errorElement).toBeInTheDocument()
```

### Playwright E2E Tests

```typescript
// Example: Testing send command menu
await page.click('[data-testid="chat-input--more-menu-button"]')
await expect(page.locator('#send-command-menu')).toBeVisible()
await page.click('[data-testid="send-command-menu--commands-tab"]')
```

## Accessibility

Semantic IDs improve accessibility by:

1. **Screen reader navigation** - Users can jump to major regions
2. **Keyboard navigation** - Focus can be programmatically managed
3. **Assistive tools** - Can reference stable identifiers
4. **ARIA labels** - Can be associated with specific IDs

Example:

```html
<header id="app-header" role="banner">
  <nav aria-label="Main navigation">
    <!-- Navigation items -->
  </nav>
</header>

<main id="session-main-content" role="main">
  <!-- Main content -->
</main>

<aside id="criteria-sidebar" aria-label="Session sidebar" role="complementary">
  <!-- Sidebar content -->
</aside>
```

## Future Considerations

1. **Component documentation** - Add JSDoc comments referencing IDs
2. **Design system integration** - Align with design tokens
3. **Performance monitoring** - Use IDs for analytics tracking
4. **Internationalization** - Ensure IDs remain meaningful across languages

## Related Documentation

- [AGENTS.md](../AGENTS.md) - Codebase guidelines
- [DESIGN-AUTO-RETRY-PATTERNS.md](DESIGN-AUTO-RETRY-PATTERNS.md) - Design patterns
- [SESSION-DEBUGGING.md](SESSION-DEBUGGING.md) - Debugging guide
