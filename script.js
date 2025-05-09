// Tab switching
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        
        // Update active tab button
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Show active tab content
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabId}Tab`).classList.add('active');
    });
});

// Image to PDF functionality
const imageDropZone = document.getElementById('imageDropZone');
const imageFileInput = document.getElementById('imageFileInput');
const imagePreview = document.getElementById('imagePreview');
const downloadImagesBtn = document.getElementById('downloadImagesBtn');

let selectedImages = [];

// Drag and drop handlers for images
imageDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageDropZone.classList.add('drag-over');
});

imageDropZone.addEventListener('dragleave', () => {
    imageDropZone.classList.remove('drag-over');
});

imageDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    imageDropZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(file => 
        file.type === 'image/jpeg' || file.type === 'image/png'
    );
    handleImageFiles(files);
});

// File input handler for images
imageFileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleImageFiles(files);
});

// Handle selected image files
function handleImageFiles(files) {
    selectedImages = [...selectedImages, ...files];
    updateImagePreview();
    downloadImagesBtn.disabled = selectedImages.length === 0;
}

// Update image preview
function updateImagePreview() {
    imagePreview.innerHTML = '';
    selectedImages.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button class="remove-image" data-index="${index}">×</button>
            `;
            imagePreview.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

// Remove image from preview
imagePreview.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-image')) {
        const index = parseInt(e.target.dataset.index);
        selectedImages.splice(index, 1);
        updateImagePreview();
        downloadImagesBtn.disabled = selectedImages.length === 0;
    }
});

// Word to PDF functionality
const wordDropZone = document.getElementById('wordDropZone');
const wordFileInput = document.getElementById('wordFileInput');
const wordPreview = document.getElementById('wordPreview');
const downloadWordBtn = document.getElementById('downloadWordBtn');
const loadingSpinner = document.getElementById('loadingSpinner');

let selectedWordFile = null;

// Word preview zoom controls
const zoomIn = document.getElementById('zoomIn');
const zoomOut = document.getElementById('zoomOut');
const zoomLevel = document.getElementById('zoomLevel');

let currentZoom = 80; // Start at 80% zoom

function updateZoom() {
    // Create content wrapper if it doesn't exist
    let contentWrapper = wordPreview.querySelector('.word-preview-content');
    if (!contentWrapper) {
        contentWrapper = document.createElement('div');
        contentWrapper.className = 'word-preview-content';
        // Move all child nodes to the wrapper
        while (wordPreview.firstChild) {
            contentWrapper.appendChild(wordPreview.firstChild);
        }
        wordPreview.appendChild(contentWrapper);
    }
    
    contentWrapper.style.transform = `scale(${currentZoom / 100})`;
    zoomLevel.textContent = `${currentZoom}%`;
}

zoomIn.addEventListener('click', () => {
    if (currentZoom < 200) {
        currentZoom += 20;
        updateZoom();
    }
});

zoomOut.addEventListener('click', () => {
    if (currentZoom > 40) {
        currentZoom -= 20;
        updateZoom();
    }
});

// Drag and drop handlers for Word files
wordDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    wordDropZone.classList.add('drag-over');
});

wordDropZone.addEventListener('dragleave', () => {
    wordDropZone.classList.remove('drag-over');
});

wordDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    wordDropZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(file => 
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword'
    );
    if (files.length > 0) {
        handleWordFile(files[0]);
    }
});

// File input handler for Word files
wordFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleWordFile(e.target.files[0]);
    }
});

// Handle Word file
function handleWordFile(file) {
    selectedWordFile = file;
    downloadWordBtn.disabled = false;
    
    // Reset zoom level
    currentZoom = 80;
    
    // Preview Word content
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const arrayBuffer = e.target.result;
            const result = await mammoth.convertToHtml({ arrayBuffer });
            
            // Create content wrapper
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'word-preview-content';
            contentWrapper.innerHTML = result.value;
            
            // Clear and update preview
            wordPreview.innerHTML = '';
            wordPreview.appendChild(contentWrapper);
            
            // Apply initial zoom
            updateZoom();
        } catch (error) {
            console.error('Error previewing Word file:', error);
            wordPreview.innerHTML = '<p>Error previewing Word file. Please try again.</p>';
        }
    };
    reader.readAsArrayBuffer(file);
}

// Generate and download PDF from images
downloadImagesBtn.addEventListener('click', async () => {
    if (selectedImages.length === 0) return;

    loadingSpinner.classList.remove('hidden');
    
    try {
        const pdfDoc = await PDFLib.PDFDocument.create();
        
        for (const file of selectedImages) {
            const imageBytes = await file.arrayBuffer();
            let image;
            
            if (file.type === 'image/jpeg') {
                image = await pdfDoc.embedJpg(imageBytes);
            } else if (file.type === 'image/png') {
                image = await pdfDoc.embedPng(imageBytes);
            }
            
            const page = pdfDoc.addPage();
            const { width, height } = page.getSize();
            const imageWidth = image.width;
            const imageHeight = image.height;
            
            const scale = Math.min(width / imageWidth, height / imageHeight);
            const scaledWidth = imageWidth * scale;
            const scaledHeight = imageHeight * scale;
            
            const x = (width - scaledWidth) / 2;
            const y = (height - scaledHeight) / 2;
            
            page.drawImage(image, {
                x,
                y,
                width: scaledWidth,
                height: scaledHeight,
            });
        }
        
        const pdfBytes = await pdfDoc.save();
        downloadPDF(pdfBytes, 'converted-images.pdf');
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    } finally {
        loadingSpinner.classList.add('hidden');
    }
});

// Convert Word to PDF
downloadWordBtn.addEventListener('click', async () => {
    if (!selectedWordFile) return;

    loadingSpinner.classList.remove('hidden');
    
    try {
        console.log('Starting Word to PDF conversion...');
        
        // Step 1: Read the file
        console.log('Reading Word file...');
        const arrayBuffer = await selectedWordFile.arrayBuffer();
        
        // Step 2: Convert to HTML with style information
        console.log('Converting to HTML...');
        const result = await mammoth.convertToHtml({ 
            arrayBuffer,
            styleMap: [
                "p[style-name='Heading 1'] => h1:fresh",
                "p[style-name='Heading 2'] => h2:fresh",
                "p[style-name='Heading 3'] => h3:fresh",
                "b => strong",
                "i => em",
                "u => u",
                "strike => s",
                "p => p:fresh"
            ],
            transformDocument: (element) => {
                if (element.type === 'text') {
                    element.value = element.value
                        .replace(/\t/g, '    ')
                        .replace(/\u00A0/g, ' ')
                        .replace(/\r\n/g, '\n')
                        .replace(/\r/g, '\n');
                }
                return element;
            }
        });
        
        if (!result.value) {
            throw new Error('No content generated from Word file');
        }

        // Step 3: Create PDF
        console.log('Creating PDF document...');
        const pdfDoc = await PDFLib.PDFDocument.create();
        
        // Step 4: Add page
        console.log('Adding page...');
        const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
        
        // Step 5: Set up text formatting
        console.log('Setting up text formatting...');
        const { width, height } = page.getSize();
        const baseFontSize = 12;
        const lineHeight = baseFontSize * 1.2;
        const margin = 50;
        const maxWidth = width - (margin * 2);
        
        // Step 6: Embed fonts
        console.log('Embedding fonts...');
        // Use a font that supports Unicode characters
        const regularFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman);
        const boldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBold);
        const italicFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanItalic);
        
        // Step 7: Process content
        console.log('Processing content...');
        
        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = result.value;
        
        let y = height - margin;
        let currentPage = page;

        // Function to process element
        function processElement(element, x = margin, fontSize = baseFontSize, isBold = false, isItalic = false) {
            const lines = [];
            
            // Handle different element types
            switch (element.tagName.toLowerCase()) {
                case 'h1':
                    fontSize = baseFontSize * 1.5;
                    isBold = true;
                    break;
                case 'h2':
                    fontSize = baseFontSize * 1.3;
                    isBold = true;
                    break;
                case 'h3':
                    fontSize = baseFontSize * 1.1;
                    isBold = true;
                    break;
                case 'strong':
                case 'b':
                    isBold = true;
                    break;
                case 'em':
                case 'i':
                    isItalic = true;
                    break;
                case 'p':
                    // Check for indentation
                    const style = window.getComputedStyle(element);
                    const textIndent = parseInt(style.textIndent) || 0;
                    const paddingLeft = parseInt(style.paddingLeft) || 0;
                    x = x + textIndent + paddingLeft;
                    break;
            }
            
            // Process text content
            if (element.nodeType === Node.TEXT_NODE) {
                const textLines = processTextWithStyles(element, x, fontSize, isBold, isItalic);
                lines.push(...textLines);
            } else {
                // Process child elements
                for (const child of element.childNodes) {
                    if (child.nodeType === Node.TEXT_NODE) {
                        const textLines = processTextWithStyles(child, x, fontSize, isBold, isItalic);
                        lines.push(...textLines);
                    } else if (child.nodeType === Node.ELEMENT_NODE) {
                        const childLines = processElement(child, x, fontSize, isBold, isItalic);
                        lines.push(...childLines);
                    }
                }
            }
            
            return lines;
        }

        // Function to process text with styles
        function processTextWithStyles(element, x, fontSize, isBold = false, isItalic = false) {
            const font = isBold ? boldFont : (isItalic ? italicFont : regularFont);
            // Replace tab characters with spaces and clean up the text
            const text = element.textContent
                .replace(/\t/g, '    ') // Replace tabs with 4 spaces
                .replace(/\u00A0/g, ' ') // Replace non-breaking spaces with regular spaces
                .replace(/\r\n/g, '\n') // Normalize line endings
                .replace(/\r/g, '\n')
                .replace(/→/g, '->') // Replace arrow with ASCII alternative
                .replace(/[^\x00-\x7F]/g, '') // Remove any remaining non-ASCII characters
                .trim();
            
            if (!text) return [];
            
            const words = text.split(/\s+/).filter(word => word.length > 0);
            let line = '';
            let lines = [];
            
            for (const word of words) {
                const testLine = line + (line ? ' ' : '') + word;
                const lineWidth = font.widthOfTextAtSize(testLine, fontSize);
                
                if (lineWidth > maxWidth - (x - margin)) {
                    lines.push({ text: line, x, font, fontSize });
                    line = word;
                } else {
                    line = testLine;
                }
            }
            if (line) {
                lines.push({ text: line, x, font, fontSize });
            }
            
            return lines;
        }

        // Process all elements
        const allLines = processElement(tempDiv);
        
        // Step 8: Draw content
        console.log('Drawing content...');
        for (const line of allLines) {
            if (y < margin) {
                console.log('Adding new page...');
                currentPage = pdfDoc.addPage([595.28, 841.89]);
                y = height - margin;
            }
            
            currentPage.drawText(line.text, {
                x: line.x,
                y: y,
                size: line.fontSize,
                font: line.font,
            });
            
            y -= lineHeight * (line.fontSize / baseFontSize);
        }
        
        // Step 9: Save PDF
        console.log('Saving PDF...');
        const pdfBytes = await pdfDoc.save();
        
        // Step 10: Download
        console.log('Downloading PDF...');
        downloadPDF(pdfBytes, 'converted-document.pdf');
        
        console.log('Conversion completed successfully!');
    } catch (error) {
        console.error('Detailed conversion error:', error);
        alert(`Error converting Word to PDF: ${error.message}`);
    } finally {
        loadingSpinner.classList.add('hidden');
    }
});

// Helper function to download PDF
function downloadPDF(pdfBytes, filename) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
} 