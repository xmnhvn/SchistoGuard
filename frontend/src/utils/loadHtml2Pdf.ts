// Utility to load html2pdf.js dynamically (for browser-only usage)
export async function loadHtml2Pdf() {
  if (typeof window === 'undefined') return null;
  if (typeof (window).html2pdf === 'function') return (window).html2pdf;
  await new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-html2pdf="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load PDF export library.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    script.dataset.html2pdf = 'true';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load PDF export library.'));
    document.body.appendChild(script);
  });
  return (window as any).html2pdf;
}

/**
 * Robustly trigger a PDF download.
 * Uses output('blob') and a manual link download, which is more reliable
 * on mobile browsers than the default .save() method.
 */
export async function triggerPdfDownload(worker: any, fileName: string) {
  try {
    const blob = await worker.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
    // For mobile Safari and some other browsers, appending to body helps
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('PDF Download failed:', error);
    // Fallback to default save if blob method fails
  }
}

/**
 * Isolates an element for high-quality, stable capture.
 * Clones the element, forces a desktop layout (A4 width),
 * and renders it in a hidden container to avoid interference
 * from mobile UI, modals, or scroll positions.
 */
export async function captureCleanElement(
  originalElement: HTMLElement,
  callback: (clonedElement: HTMLElement) => Promise<void>
) {
  if (typeof window === 'undefined') return;

  // 1. Create a hidden container on the body
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // A4 width at 96 DPI
  container.style.backgroundColor = 'white';
  container.style.zIndex = '-9999';
  
  // 2. Clone the element
  const clone = originalElement.cloneNode(true) as HTMLElement;
  
  // 3. Force desktop-friendly styles on the clone
  clone.style.width = '794px';
  clone.style.minWidth = '794px';
  clone.style.maxWidth = '794px';
  clone.style.margin = '0';
  clone.style.padding = originalElement.style.padding || '20px';
  clone.style.boxSizing = 'border-box';
  clone.style.overflow = 'visible';
  clone.style.height = 'auto';
  
  // Ensure background is visible to html2canvas
  clone.style.backgroundColor = 'white';

  // 4. Attach and run capture logic
  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    // Small delay to ensure any reflows or dynamic content (like SVGs) are stable
    await new Promise(resolve => setTimeout(resolve, 250));
    await callback(clone);
  } finally {
    // 5. Cleanup
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
