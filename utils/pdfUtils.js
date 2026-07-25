const generatePDF = async (page, { print_date, options = {} } = {}) => {
  const defaultOptions = {
    format: "A4",
    landscape: true,
    margin: {
      top: "0.3in",
      right: "0.3in",
      bottom: "0.7in",
      left: "0.3in",
    },
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    footerTemplate: `
      <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
        ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
        ${print_date ? '&nbsp;&nbsp;&nbsp;' : ''}
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>
    `,
    headerTemplate: `<div></div>`,
    compress: true,
  };

  const pdfOptions = { ...defaultOptions, ...options };
  return await page.pdf(pdfOptions);
};

const generatePDFWithoutPrintDate = async (page, { print_date, options = {} } = {}) => {
  const defaultOptions = {
    format: "A4",
    landscape: true,
    
    margin: {
      top: "0.3in",
      right: "0.3in",
      bottom: "0.7in",
      left: "0.3in",
    },
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    footerTemplate: `
      <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>
    `,
    headerTemplate: `<div></div>`,
    compress: true,
  };

  const pdfOptions = { ...defaultOptions, ...options };
  return await page.pdf(pdfOptions);
};

const generatePressurePDFWithoutPrintDate = async (page, { print_date, options = {} } = {}) => {
  const defaultOptions = {
    format: "A4",
    landscape: true,
     scale: 0.85,   

    margin: {
      top: "0.3in",
      right: "0.3in",
      bottom: "0.7in",
      left: "0.3in",
    },
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    footerTemplate: `
      <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>
    `,
    headerTemplate: `<div></div>`,
    compress: true,
  };

  const pdfOptions = { ...defaultOptions, ...options };
  return await page.pdf(pdfOptions);
};

const generatePDFA4 = async (page, { print_date = true, options = {} } = {}) => {
  const defaultOptions = {
    format: "A4",
    margin: {
      top: "0.3in",
      right: "0.3in",
      bottom: "0.7in",
      left: "0.3in",
    },
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    footerTemplate: `
      <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
        ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
        ${print_date ? '&nbsp;&nbsp;&nbsp;' : ''}
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>
    `,
    headerTemplate: `<div></div>`,
    compress: true,
  };

  const pdfOptions = { ...defaultOptions, ...options };
  return await page.pdf(pdfOptions);
};

const generatePDFA4WithoutPrintDate = async (page, { print_date = true, options = {} } = {}) => {
  const defaultOptions = {
    format: "A4",
    margin: {
      top: "0.3in",
      right: "0.3in",
      bottom: "0.7in",
      left: "0.3in",
    },
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    footerTemplate: `
      <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>
    `,
    headerTemplate: `<div></div>`,
    compress: true,
  };

  const pdfOptions = { ...defaultOptions, ...options };
  return await page.pdf(pdfOptions);
};

const generatePDFLarge = async (page, { print_date = true } = {}) => {
  const defaultOptions = {
    // format: "A4",
    width: "22in",
    height: "8.5in",
    timeout: 60000000,
    margin: {
      top: "0.3in",
      right: "0.3in",
      bottom: "0.7in",
      left: "0.3in",
    },
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    footerTemplate: `
      <div style="font-size: 14px; width: 100%; text-align: right; padding-right: 50px; padding-bottom: 30px;">
        ${print_date ? `<span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>` : ''}
        ${print_date ? '&nbsp;&nbsp;&nbsp;' : ''}
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>
    `,
    headerTemplate: `<div></div>`,
    compress: true,
  };

  const pdfOptions = { ...defaultOptions };
  return await page.pdf(pdfOptions);
};


module.exports = { generatePDF, generatePDFWithoutPrintDate,generatePressurePDFWithoutPrintDate, generatePDFA4, generatePDFA4WithoutPrintDate, generatePDFLarge };
