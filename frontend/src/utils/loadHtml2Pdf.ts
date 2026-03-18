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
  return (window).html2pdf;
}
