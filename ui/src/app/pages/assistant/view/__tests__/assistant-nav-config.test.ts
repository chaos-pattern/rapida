import { SourceControl } from '@carbon/icons-react';
import { assistantNavSections } from '@/app/pages/assistant/view/assistant-nav-config';

describe('assistantNavSections', () => {
  it('uses source control icon for assistant versions navigation', () => {
    const versionsItem = assistantNavSections
      .flatMap(section => section.items)
      .find(item => item.key === 'versions');

    expect(versionsItem?.icon).toBe(SourceControl);
  });
});
