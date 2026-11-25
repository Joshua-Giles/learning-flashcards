import { TestBed } from '@angular/core/testing';
import { PREF_KEYS } from './local-prefs';
import { SidebarSections, categoryKey, groupKey } from './sidebar-sections';

const create = () => TestBed.inject(SidebarSections);

describe('SidebarSections', () => {
  beforeEach(() => localStorage.clear());

  it('starts with everything expanded', () => {
    const s = create();
    expect(s.isCollapsed(categoryKey('Music'))).toBe(false);
    expect(s.anyCollapsed()).toBe(false);
  });

  it('toggles a section and remembers it across reloads', () => {
    create().toggle(groupKey('Music', 'Nick Drake'));
    TestBed.resetTestingModule();
    const s = create();
    expect(s.isCollapsed(groupKey('Music', 'Nick Drake'))).toBe(true);
    s.toggle(groupKey('Music', 'Nick Drake'));
    expect(s.isCollapsed(groupKey('Music', 'Nick Drake'))).toBe(false);
  });

  it('collapses all given sections and expands all again', () => {
    const s = create();
    s.collapseAll([categoryKey('Music'), categoryKey('Languages')]);
    expect(s.isCollapsed(categoryKey('Languages'))).toBe(true);
    expect(s.anyCollapsed()).toBe(true);
    s.expandAll();
    expect(s.anyCollapsed()).toBe(false);
  });

  it('ignores garbage in storage', () => {
    localStorage.setItem(PREF_KEYS.sidebarCollapsed, '{not json');
    expect(create().anyCollapsed()).toBe(false);
  });
});
