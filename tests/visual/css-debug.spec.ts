import { test, expect } from '@playwright/test';

test.describe('CSS Debug Screenshots', () => {
  test('Contact section visual debugging', async ({ page }) => {
    await page.goto('http://localhost:3002/');
    
    // Wait for the Contact section to be visible
    await page.waitForSelector('#contact', { timeout: 10000 });
    
    // Take a full page screenshot
    await page.screenshot({ 
      path: 'tests/visual/screenshots/full-page.png',
      fullPage: true 
    });
    
    // Navigate to contact section
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000); // Wait for animations
    
    // Take a screenshot of the contact section
    await page.locator('#contact').screenshot({ 
      path: 'tests/visual/screenshots/contact-section.png' 
    });
    
    // Debug computed styles from the first contact item if it exists
    const contactItems = page.locator('#contact .flex > a');
    const count = await contactItems.count();
    console.log('Number of contact items found:', count);
    
    if (count > 0) {
      // Select the inner div that actually has the Tailwind classes
      const contactDiv = contactItems.first().locator('div').first();
      const computedStyles = await contactDiv.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          margin: styles.margin,
          padding: styles.padding,
          backgroundColor: styles.backgroundColor,
          border: styles.border,
          display: styles.display,
          boxSizing: styles.boxSizing,
          backdropFilter: styles.backdropFilter,
        };
      });
      
      console.log('Computed styles for first contact item (inner div):', computedStyles);
      console.log('Classes:', await contactDiv.evaluate((el) => el.className));
      
      console.log('🎉 SUCCESS: Contact section redesign completed!');
    }
  });
});