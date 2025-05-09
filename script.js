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
    
    // Preview Word content
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const arrayBuffer = e.target.result;
            const result = await mammoth.convertToHtml({ arrayBuffer });
            wordPreview.innerHTML = result.value;
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
        const arrayBuffer = await selectedWordFile.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        
        // Create PDF from HTML content
        const pdfDoc = await PDFLib.PDFDocument.create();
        const page = pdfDoc.addPage();
        
        // Add the HTML content as text (simplified version)
        const { width, height } = page.getSize();
        page.drawText(result.value, {
            x: 50,
            y: height - 50,
            size: 12,
            maxWidth: width - 100,
        });
        
        const pdfBytes = await pdfDoc.save();
        downloadPDF(pdfBytes, 'converted-document.pdf');
    } catch (error) {
        console.error('Error converting Word to PDF:', error);
        alert('Error converting Word to PDF. Please try again.');
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