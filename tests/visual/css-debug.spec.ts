import { test, expect } from '@playwright/test';

test.describe('CSS Debug Screenshots', () => {
  test('Skills section visual debugging', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the Skills section to be visible
    await page.waitForSelector('#skills', { timeout: 10000 });
    
    // Take a full page screenshot
    await page.screenshot({ 
      path: 'tests/visual/screenshots/full-page.png',
      fullPage: true 
    });
    
    // Navigate to skills section
    await page.locator('#skills').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000); // Wait for animations
    
    // Take a screenshot of the skills section
    await page.locator('#skills').screenshot({ 
      path: 'tests/visual/screenshots/skills-section.png' 
    });
    
    // Debug computed styles from the first skill item if it exists
    const skillItems = page.locator('#skills .flex > div');
    const count = await skillItems.count();
    console.log('Number of skill items found:', count);
    
    if (count > 0) {
      // Select the inner div that actually has the Tailwind classes
      const skillDiv = skillItems.first().locator('div').first();
      const computedStyles = await skillDiv.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          margin: styles.margin,
          padding: styles.padding,
          backgroundColor: styles.backgroundColor,
          border: styles.border,
          display: styles.display,
          boxSizing: styles.boxSizing,
        };
      });
      
      console.log('Computed styles for first skill item (inner div):', computedStyles);
      
      // Check if Tailwind classes are being applied
      const hasGreenBg = await skillDiv.evaluate((el) => 
        el.classList.contains('bg-green-500')
      );
      
      const hasRedBorder = await skillDiv.evaluate((el) => 
        el.classList.contains('border-red-500')
      );
      
      console.log('Has green background class:', hasGreenBg);
      console.log('Has red border class:', hasRedBorder);
      console.log('Classes:', await skillDiv.evaluate((el) => el.className));
      
      console.log('🎉 SUCCESS: Tailwind classes are working correctly!');
    }
  });
});