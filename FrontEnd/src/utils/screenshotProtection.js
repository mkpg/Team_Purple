// Keyboard & Web Scraping Interception
export function initScreenshotProtection() {
  if (typeof window === 'undefined') return;

  // 1. Prevent standard hotkeys for printing, saving, and DevTools
  const handleKeyDown = (e) => {
    // PrintScreen
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      e.preventDefault();
      return false;
    }

    // Windows Snipping Tool (Win+Shift+S)
    if (e.metaKey && e.shiftKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
      e.preventDefault();
      return false;
    }

    // macOS Screenshots (Cmd+Shift+3 or Cmd+Shift+4)
    if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4')) {
      e.preventDefault();
      return false;
    }

    // Ctrl+P / Cmd+P (Print to PDF / capture)
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      return false;
    }

    // Ctrl+S / Cmd+S (Save website / image assets)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      return false;
    }

    // DevTools blocking (to prevent inspect-element web scraping)
    if (
      e.key === 'F12' || 
      ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j'))
    ) {
      e.preventDefault();
      alert("Developer console inspection is disabled on this page to prevent web scraping.");
      return false;
    }
  };

  window.addEventListener('keydown', handleKeyDown, true);

  // 2. Prevent right click context menu on images (prevents saving/scraping)
  const handleContextMenu = (e) => {
    const target = e.target;
    if (target.tagName === 'IMG' || target.classList.contains('product-image') || target.closest('.product-image-wrapper')) {
      e.preventDefault();
      return false;
    }
  };

  document.addEventListener('contextmenu', handleContextMenu, true);

  // 3. Prevent dragging of images
  const handleDragStart = (e) => {
    const target = e.target;
    if (target.tagName === 'IMG') {
      e.preventDefault();
      return false;
    }
  };

  document.addEventListener('dragstart', handleDragStart, true);

  // Cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('contextmenu', handleContextMenu, true);
    document.removeEventListener('dragstart', handleDragStart, true);
  };
}
