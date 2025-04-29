document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const preview = document.getElementById('preview');
  const startCameraBtn = document.getElementById('startCamera');
  const capturePhotoBtn = document.getElementById('capturePhoto');
  const fileInput = document.getElementById('fileInput');
  const analyzeBtn = document.getElementById('analyzePhoto');
  const resetBtn = document.getElementById('reset');
  const previewControls = document.getElementById('previewControls');
  const photoResults = document.getElementById('photoResults');
  const descriptionContainer = document.getElementById('description');
  const extractionContainer = document.getElementById('extraction');

  // State
  let stream = null;
  let currentPhotoData = null;
  
  // Initially hide the preview controls
  previewControls.classList.add('hidden');

  // Camera Setup
  startCameraBtn.addEventListener('click', async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      video.srcObject = stream;
      startCameraBtn.textContent = 'Camera Active';
      startCameraBtn.disabled = true;
      capturePhotoBtn.disabled = false;
    } catch (err) {
      console.error('Error accessing camera:', err);
      showError('Could not access camera. Please ensure you have granted camera permissions.');
    }
  });

  // Capture Photo
  capturePhotoBtn.addEventListener('click', () => {
    if (!stream) return;
    
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64 data URL
    currentPhotoData = canvas.toDataURL('image/jpeg');
    
    // Show preview
    preview.src = currentPhotoData;
    preview.style.display = 'block';
    previewControls.classList.remove('hidden');
    photoResults.classList.remove('hidden');
    
    // Stop camera
    stopCamera();
    
    // Automatically analyze the image
    analyzePhoto();
  });

  // File Upload
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      currentPhotoData = e.target.result;
      preview.src = currentPhotoData;
      preview.style.display = 'block';
      previewControls.classList.remove('hidden');
      photoResults.classList.remove('hidden');
      
      // Stop camera if it's active
      stopCamera();
      
      // Automatically analyze the image
      analyzePhoto();
    };
    reader.readAsDataURL(file);
  });

  // Analyze Photo button (for manual triggering if needed)
  analyzeBtn.addEventListener('click', () => {
    analyzePhoto();
  });

  // Reset
  resetBtn.addEventListener('click', () => {
    currentPhotoData = null;
    preview.src = '';
    preview.style.display = 'none';
    previewControls.classList.add('hidden');
    photoResults.classList.add('hidden');
    descriptionContainer.innerHTML = '<p>Processing will automatically start after taking or uploading a photo.</p>';
    extractionContainer.textContent = 'Structured data will appear here.';
    
    // Reset file input
    fileInput.value = '';
    
    // Allow starting camera again
    startCameraBtn.disabled = false;
    startCameraBtn.textContent = 'Start Camera';
  });

  // Helper Functions
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
      video.srcObject = null;
      startCameraBtn.disabled = false;
      startCameraBtn.textContent = 'Start Camera';
      capturePhotoBtn.disabled = true;
    }
  }

  async function analyzePhoto() {
    if (!currentPhotoData) return;
    
    // Start both processes in parallel
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span class="loader"></span> Analyzing...';
    
    // Set loading states
    descriptionContainer.innerHTML = '<p>Generating description...</p>';
    extractionContainer.textContent = 'Extracting data...';
    
    try {
      // Start both requests in parallel
      const [descriptionPromise, extractionPromise] = await Promise.all([
        processDescription(),
        processExtraction()
      ]);
      
      // Both promises will resolve when their respective tasks complete
    } catch (err) {
      console.error('Error analyzing photo:', err);
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Re-analyze';
    }
  }
  
  async function processDescription() {
    try {
      // Send photo for description
      const response = await fetch('/api/photos/describe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: currentPhotoData })
      });
      
      // Since this is a streaming response, handle it accordingly
      const reader = response.body.getReader();
      let decoder = new TextDecoder();
      let fullText = '';
      descriptionContainer.innerHTML = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value, { stream: true });
        fullText += text;
        
        // Convert Markdown to HTML using Marked.js
        descriptionContainer.innerHTML = marked.parse(fullText);
        
        // Scroll to bottom as text streams in
        descriptionContainer.scrollTop = descriptionContainer.scrollHeight;
      }
    } catch (err) {
      console.error('Error describing photo:', err);
      descriptionContainer.innerHTML = '<p class="error">Failed to analyze image. Please try again.</p>';
    }
  }
  
  async function processExtraction() {
    try {
      // Send photo for extraction
      const response = await fetch('/api/photos/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: currentPhotoData })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      try {
        // Handle the error case when we get an error message
        if (data.error) {
          extractionContainer.innerHTML = `<p class="error">${data.error}</p>`;
          return;
        }
        
        // Try to parse the result, handling both string and object formats
        let parsedData = data;
        if (typeof data === 'string') {
          try {
            parsedData = JSON.parse(data);
          } catch (parseErr) {
            console.error('Error parsing JSON string:', parseErr);
          }
        }
        
        extractionContainer.innerHTML = formatJSONtoHTML(parsedData);
      } catch (err) {
        console.error('Error processing extraction response:', err);
        extractionContainer.innerHTML = '<p class="error">Error processing data format</p>';
      }
    } catch (err) {
      console.error('Error extracting data:', err);
      extractionContainer.textContent = 'Failed to extract data. Please try again.';
    }
  }

  function convertToMarkdown(text) {
    // Basic markdown conversions
    let html = text
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Headers (h3 and below only to fit the UI)
      .replace(/^### (.*?)$/gm, '<h5>$1</h5>')
      .replace(/^#### (.*?)$/gm, '<h6>$1</h6>')
      // Lists
      .replace(/^- (.*?)$/gm, '<li>$1</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>');
    
    // Wrap in paragraph tags if not already
    if (!html.startsWith('<')) {
      html = '<p>' + html + '</p>';
    }
    
    // Clean up any list items
    if (html.includes('<li>')) {
      html = html.replace(/<p>(<li>.*?<\/li>)<\/p>/g, '<ul>$1</ul>');
    }
    
    return html;
  }
  
  function formatJSONtoHTML(json) {
    let html = '<div class="json-output">';
    
    // Process objects array
    if (json.objects && json.objects.length) {
      html += '<div class="json-section"><h4>Objects Detected</h4><ul>';
      json.objects.forEach(obj => {
        html += `<li>${obj}</li>`;
      });
      html += '</ul></div>';
    }
    
    // Process scene type
    if (json.scene_type) {
      html += `<div class="json-section"><h4>Scene Type</h4><p>${json.scene_type}</p></div>`;
    }
    
    // Process text content
    if (json.text_content) {
      html += `<div class="json-section"><h4>Text Content</h4><p>${json.text_content}</p></div>`;
    }
    
    // Process colors
    if (json.colors && json.colors.length) {
      html += '<div class="json-section"><h4>Colors</h4><div class="color-swatches">';
      json.colors.forEach(color => {
        html += `<span class="color-label">${color}</span>`;
      });
      html += '</div></div>';
    }
    
    // Process crucial elements
    if (json.crucial_elements && json.crucial_elements.length) {
      html += '<div class="json-section"><h4>Key Elements</h4><ul>';
      json.crucial_elements.forEach(element => {
        html += `<li>${element}</li>`;
      });
      html += '</ul></div>';
    }
    
    // Add any additional properties
    const handledProps = ['objects', 'scene_type', 'text_content', 'colors', 'crucial_elements'];
    const additionalProps = Object.keys(json).filter(key => !handledProps.includes(key));
    
    if (additionalProps.length) {
      html += '<div class="json-section"><h4>Additional Information</h4>';
      additionalProps.forEach(prop => {
        if (typeof json[prop] === 'object') {
          html += `<div><strong>${formatPropName(prop)}:</strong> ${JSON.stringify(json[prop])}</div>`;
        } else {
          html += `<div><strong>${formatPropName(prop)}:</strong> ${json[prop]}</div>`;
        }
      });
      html += '</div>';
    }
    
    html += '</div>';
    return html;
  }
  
  function formatPropName(name) {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    document.querySelector('.capture-section').appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }
});