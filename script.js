const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const imagePreview = document.getElementById('imagePreview');
const downloadBtn = document.getElementById('downloadBtn');
const loadingSpinner = document.getElementById('loadingSpinner');

let selectedFiles = [];

// Drag and drop handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(file => 
        file.type === 'image/jpeg' || file.type === 'image/png'
    );
    handleFiles(files);
});

// File input handler
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
});

// Handle selected files
function handleFiles(files) {
    selectedFiles = [...selectedFiles, ...files];
    updatePreview();
    downloadBtn.disabled = selectedFiles.length === 0;
}

// Update image preview
function updatePreview() {
    imagePreview.innerHTML = '';
    selectedFiles.forEach((file, index) => {
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
        selectedFiles.splice(index, 1);
        updatePreview();
        downloadBtn.disabled = selectedFiles.length === 0;
    }
});

// Generate and download PDF
downloadBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    loadingSpinner.classList.remove('hidden');
    
    try {
        const pdfDoc = await PDFLib.PDFDocument.create();
        
        for (const file of selectedFiles) {
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
            
            // Calculate dimensions to maintain aspect ratio
            const scale = Math.min(width / imageWidth, height / imageHeight);
            const scaledWidth = imageWidth * scale;
            const scaledHeight = imageHeight * scale;
            
            // Center the image on the page
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
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'converted-images.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}); 