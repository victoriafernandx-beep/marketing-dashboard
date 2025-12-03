// ============================================
// MARKETING ANALYTICS DASHBOARD
// Main Application Logic
// ============================================

// ============================================
// CSV MAPPER CLASS
// Handles dynamic CSV column mapping
// ============================================
class CSVMapper {
  constructor() {
    this.templates = this.loadTemplates();
    this.currentMapping = null;
  }

  // ============================================
  // TEMPLATE MANAGEMENT
  // ============================================

  getDefaultTemplates() {
    return {
      'edrone': {
        name: 'Edrone',
        mapping: {
          campaignName: 'TITULO',
          date: 'DATA',
          sent: 'ENVIO',
          opens: 'ABERTO',
          clicks: 'CLIQUE',
          conversions: 'PEDIDO',
          revenue: 'RECEITA',
          engagementType: 'CAMPANHA'
        },
        labels: {
          sent: 'Enviados',
          opens: 'Aberturas',
          clicks: 'Cliques',
          conversions: 'Pedidos',
          revenue: 'Receita'
        }
      },
      'rd_station': {
        name: 'RD Station',
        mapping: {
          campaignName: 'nome',
          date: 'data',
          sent: 'emails_enviados',
          opens: 'aberturas',
          clicks: 'cliques',
          conversions: 'conversoes',
          revenue: 'receita'
        },
        labels: {
          sent: 'Emails Enviados',
          opens: 'Aberturas',
          clicks: 'Cliques',
          conversions: 'Conversões',
          revenue: 'Receita'
        }
      },
      'google_ads': {
        name: 'Google Ads',
        mapping: {
          campaignName: 'Campaign',
          date: 'Day',
          sent: 'Impressions',
          clicks: 'Clicks',
          conversions: 'Conversions',
          revenue: 'Cost'
        },
        labels: {
          sent: 'Impressões',
          opens: 'Visualizações',
          clicks: 'Cliques',
          conversions: 'Conversões',
          revenue: 'Custo'
        },
        calculations: {
          clickRate: 'clicks / sent * 100'
        }
      },
      'facebook_ads': {
        name: 'Facebook Ads',
        mapping: {
          campaignName: 'Campaign name',
          date: 'Reporting starts',
          sent: 'Reach',
          opens: 'Post engagement',
          clicks: 'Link clicks',
          conversions: 'Purchases',
          revenue: 'Amount spent'
        },
        labels: {
          sent: 'Alcance',
          opens: 'Engajamento',
          clicks: 'Cliques no Link',
          conversions: 'Compras',
          revenue: 'Valor Gasto'
        }
      },
      'mailchimp': {
        name: 'Mailchimp',
        mapping: {
          campaignName: 'Campaign Title',
          date: 'Send Time',
          sent: 'Emails Sent',
          opens: 'Unique Opens',
          clicks: 'Unique Clicks',
          conversions: 'E-Commerce Orders',
          revenue: 'E-Commerce Revenue'
        },
        labels: {
          sent: 'Emails Enviados',
          opens: 'Aberturas Únicas',
          clicks: 'Cliques Únicos',
          conversions: 'Pedidos',
          revenue: 'Receita'
        }
      }
    };
  }

  loadTemplates() {
    const stored = localStorage.getItem('csv_mapping_templates');
    const defaultTemplates = this.getDefaultTemplates();

    if (stored) {
      try {
        const customTemplates = JSON.parse(stored);
        return { ...defaultTemplates, ...customTemplates };
      } catch (e) {
        console.error('Error loading templates:', e);
        return defaultTemplates;
      }
    }

    return defaultTemplates;
  }

  saveTemplate(templateId, template) {
    const stored = localStorage.getItem('csv_mapping_templates');
    let customTemplates = {};

    if (stored) {
      try {
        customTemplates = JSON.parse(stored);
      } catch (e) {
        console.error('Error parsing stored templates:', e);
      }
    }

    customTemplates[templateId] = template;
    localStorage.setItem('csv_mapping_templates', JSON.stringify(customTemplates));
    this.templates = this.loadTemplates();
  }

  deleteTemplate(templateId) {
    const stored = localStorage.getItem('csv_mapping_templates');
    if (!stored) return;

    try {
      const customTemplates = JSON.parse(stored);
      delete customTemplates[templateId];
      localStorage.setItem('csv_mapping_templates', JSON.stringify(customTemplates));
      this.templates = this.loadTemplates();
    } catch (e) {
      console.error('Error deleting template:', e);
    }
  }

  // ============================================
  // COLUMN DETECTION
  // ============================================

  detectColumnTypes(headers, sampleRows) {
    const types = {};

    headers.forEach(header => {
      const values = sampleRows.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== '');

      if (values.length === 0) {
        types[header] = 'unknown';
        return;
      }

      // Check if it's a date
      const dateCount = values.filter(v => this.isDate(v)).length;
      if (dateCount / values.length > 0.7) {
        types[header] = 'date';
        return;
      }

      // Check if it's a number
      const numberCount = values.filter(v => this.isNumber(v)).length;
      if (numberCount / values.length > 0.7) {
        types[header] = 'number';
        return;
      }

      // Check if it's a percentage
      const percentCount = values.filter(v => this.isPercentage(v)).length;
      if (percentCount / values.length > 0.7) {
        types[header] = 'percentage';
        return;
      }

      // Default to text
      types[header] = 'text';
    });

    return types;
  }

  isDate(value) {
    if (!value) return false;
    const str = String(value).trim();

    // Common date patterns
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,  // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY or MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/,   // DD-MM-YYYY
      /^\d{4}\/\d{2}\/\d{2}$/  // YYYY/MM/DD
    ];

    if (datePatterns.some(pattern => pattern.test(str))) {
      const date = new Date(str);
      return !isNaN(date.getTime());
    }

    return false;
  }

  isNumber(value) {
    if (value === null || value === undefined || value === '') return false;
    const str = String(value).trim();

    // Remove common number formatting
    const cleaned = str.replace(/[,.]/g, '').replace(/[^\d.-]/g, '');
    return !isNaN(cleaned) && cleaned !== '';
  }

  isPercentage(value) {
    if (!value) return false;
    const str = String(value).trim();
    return str.includes('%') && this.isNumber(str.replace('%', ''));
  }

  // ============================================
  // SMART MAPPING SUGGESTION
  // ============================================

  suggestMapping(headers) {
    const normalized = headers.map(h => h.toLowerCase().trim());
    const suggestion = {};

    // Keywords for each metric
    const keywords = {
      campaignName: ['campaign', 'campanha', 'nome', 'name', 'titulo', 'title'],
      date: ['date', 'data', 'day', 'dia', 'created', 'send time', 'reporting starts'],
      sent: ['sent', 'enviados', 'envio', 'impressions', 'impressoes', 'reach', 'alcance', 'emails sent'],
      opens: ['opens', 'aberto', 'aberturas', 'unique opens', 'engagement', 'engajamento'],
      clicks: ['clicks', 'clique', 'cliques', 'unique clicks', 'link clicks'],
      conversions: ['conversions', 'conversoes', 'pedido', 'orders', 'purchases', 'compras'],
      revenue: ['revenue', 'receita', 'valor', 'value', 'cost', 'custo', 'amount spent', 'e-commerce revenue']
    };

    // Try to match each metric
    Object.keys(keywords).forEach(metric => {
      const matchIndex = normalized.findIndex(header =>
        keywords[metric].some(keyword => header.includes(keyword))
      );

      if (matchIndex !== -1) {
        suggestion[metric] = headers[matchIndex];
      }
    });

    return suggestion;
  }

  // ============================================
  // AUTO-DETECT TEMPLATE
  // ============================================

  autoDetectTemplate(headers) {
    const normalized = headers.map(h => h.toLowerCase().trim());

    // Check each template
    for (const [templateId, template] of Object.entries(this.templates)) {
      const mappingValues = Object.values(template.mapping).map(v => v.toLowerCase());
      const matchCount = mappingValues.filter(value =>
        normalized.some(header => header.includes(value) || value.includes(header))
      ).length;

      // If more than 60% of columns match, consider it a match
      if (matchCount / mappingValues.length > 0.6) {
        console.log(`Auto-detected template: ${template.name} (${matchCount}/${mappingValues.length} columns matched)`);
        return templateId;
      }
    }

    return null;
  }

  // ============================================
  // MAPPING VALIDATION
  // ============================================

  validateMapping(mapping, columnTypes) {
    const errors = [];
    const required = ['campaignName', 'date', 'sent'];

    // Check required fields
    required.forEach(field => {
      if (!mapping[field]) {
        errors.push(`Campo obrigatório não mapeado: ${field}`);
      }
    });

    // Check types
    if (mapping.date && columnTypes[mapping.date] !== 'date') {
      errors.push(`Coluna "${mapping.date}" não parece ser uma data`);
    }

    const numericFields = ['sent', 'opens', 'clicks', 'conversions', 'revenue'];
    numericFields.forEach(field => {
      if (mapping[field] && columnTypes[mapping[field]] !== 'number' && columnTypes[mapping[field]] !== 'percentage') {
        errors.push(`Coluna "${mapping[field]}" não parece ser numérica`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ============================================
  // EXPORT/IMPORT
  // ============================================

  exportTemplate(templateId) {
    const template = this.templates[templateId];
    if (!template) return null;

    const exportData = {
      id: templateId,
      ...template,
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }

  importTemplate(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      const templateId = data.id || `custom_${Date.now()}`;

      delete data.id;
      delete data.exportedAt;

      this.saveTemplate(templateId, data);
      return { success: true, templateId };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

class MarketingDashboard {
  constructor() {
    this.campaigns = [];
    this.charts = {};
    this.csvMapper = new CSVMapper(); // CSV Mapper instance
    this.currentFilters = {
      crm: 'all',
      dateRange: 'all',
      status: 'all',
      campaignType: 'all',
      search: ''
    };

    this.init();
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  init() {
    this.loadDataFromStorage();
    this.setupEventListeners();
    this.setupTheme();

    // Only show dashboard if we have valid campaigns
    if (this.campaigns.length > 0) {
      console.log('Loaded campaigns from storage:', this.campaigns.length);
      this.showDashboard();
    } else {
      console.log('No campaigns in storage, showing upload screen');
      // Make sure upload section is visible
      document.getElementById('upload-section').classList.remove('hidden');
    }
  }

  setupEventListeners() {
    // File upload
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');

    uploadArea.addEventListener('click', () => {
      console.log('Upload area clicked');
      fileInput.click();
    });
    fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      this.handleFileSelect({ target: { files: e.dataTransfer.files } });
    });

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
      this.toggleTheme();
    });

    // Clear data
    document.getElementById('clear-data-btn').addEventListener('click', () => {
      console.log('Clear data button clicked');
      if (confirm('Tem certeza que deseja limpar todos os dados?')) {
        this.clearAllData();
      }
    });

    // Filters


    document.getElementById('date-range-filter')?.addEventListener('change', (e) => {
      this.currentFilters.dateRange = e.target.value;
      this.applyFilters();
    });

    document.getElementById('status-filter')?.addEventListener('change', (e) => {
      this.currentFilters.status = e.target.value;
      this.applyFilters();
    });

    document.getElementById('campaign-type-filter')?.addEventListener('change', (e) => {
      this.currentFilters.campaignType = e.target.value;
      this.applyFilters();
    });

    // Search
    document.getElementById('search-input')?.addEventListener('input', (e) => {
      this.currentFilters.search = e.target.value.toLowerCase();
      this.renderTable();
    });

    // Export
    document.getElementById('export-btn')?.addEventListener('click', () => {
      this.exportReport();
    });

    document.getElementById('export-csv-btn')?.addEventListener('click', () => {
      this.exportCSV();
    });

    // Chart metric selectors
    document.getElementById('timeline-metric')?.addEventListener('change', () => {
      this.updateTimelineChart();
    });

    document.getElementById('top-campaigns-metric')?.addEventListener('change', () => {
      this.updateTopCampaignsChart();
    });

    document.getElementById('monthly-metric')?.addEventListener('change', () => {
      this.updateMonthlyChart();
    });

    // Export Charts
    document.querySelectorAll('.export-chart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const chartId = e.currentTarget.getAttribute('data-chart');
        this.exportChartAsImage(chartId);
      });
    });

    document.getElementById('export-all-charts-btn')?.addEventListener('click', () => {
      this.exportAllCharts();
    });

    document.getElementById('export-monthly-chart-btn')?.addEventListener('click', () => {
      this.exportChartAsImage('monthly-chart');
    });

    // Executive Summary
    document.getElementById('copy-summary-btn')?.addEventListener('click', () => {
      this.copySummaryToClipboard();
    });

    // Presentation Mode
    document.getElementById('presentation-mode-toggle')?.addEventListener('click', () => {
      this.togglePresentationMode();
    });
  }

  // ============================================
  // FILE HANDLING
  // ============================================
  async handleFileSelect(event) {
    console.log('handleFileSelect called');
    try {
      const files = Array.from(event.target.files);
      console.log('Files selected:', files.map(f => f.name));

      if (files.length === 0) return;

      for (const file of files) {
        const fileName = file.name.toLowerCase();
        console.log('Processing file:', fileName, 'Type:', file.type);

        if (file.type === 'text/csv' || fileName.endsWith('.csv')) {
          console.log('Parsing as CSV...');
          await this.parseCSV(file);
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') ||
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'application/vnd.ms-excel') {
          console.log('Parsing as XLSX...');
          await this.parseXLSX(file);
        } else {
          console.warn('Unsupported file format:', fileName);
          alert(`Formato de arquivo não suportado: ${file.name}\nUse arquivos .csv, .xlsx ou .xls`);
        }
      }

      this.saveDataToStorage();
      this.showDashboard();
    } catch (error) {
      console.error('Error in handleFileSelect:', error);
      alert('Ocorreu um erro ao processar o arquivo: ' + error.message);
    }
  }

  // ============================================
  // CSV MAPPING MODAL LOGIC
  // ============================================

  async showMappingModal(file, headers, sampleData) {
    return new Promise((resolve) => {
      const modal = document.getElementById('csv-mapping-modal');
      const overlay = document.getElementById('modal-overlay');
      const closeBtn = document.getElementById('modal-close-btn');
      const cancelBtn = document.getElementById('cancel-mapping-btn');
      const applyBtn = document.getElementById('apply-mapping-btn');
      const saveTemplateBtn = document.getElementById('save-template-btn');
      const templateSelect = document.getElementById('template-select');

      // Store current file data
      this.currentFile = { file, headers, sampleData };

      // Detect column types
      const columnTypes = this.csvMapper.detectColumnTypes(headers, sampleData);
      this.currentFile.columnTypes = columnTypes;

      // Try to auto-detect template
      const detectedTemplateId = this.csvMapper.autoDetectTemplate(headers);
      if (detectedTemplateId) {
        templateSelect.value = detectedTemplateId;
        this.csvMapper.currentMapping = this.csvMapper.templates[detectedTemplateId].mapping;
      } else {
        templateSelect.value = '';
        // Suggest mapping based on headers
        this.csvMapper.currentMapping = this.csvMapper.suggestMapping(headers);
      }

      // Populate modal
      this.populateMappingModal();
      this.updateMappingPreview();

      // Show modal
      modal.classList.remove('hidden');

      // Event Listeners
      const closeModal = () => {
        modal.classList.add('hidden');
        resolve(null); // Return null if cancelled
      };

      const applyMapping = () => {
        const mapping = this.getMappingFromUI();
        const validation = this.csvMapper.validateMapping(mapping, columnTypes);

        if (!validation.valid) {
          const validationDiv = document.getElementById('validation-messages');
          validationDiv.innerHTML = validation.errors.map(e =>
            `<div class="validation-error"><span class="material-symbols-outlined">error</span>${e}</div>`
          ).join('');
          validationDiv.classList.remove('hidden');
          return;
        }

        modal.classList.add('hidden');
        resolve(mapping);
      };

      // Remove previous listeners to avoid duplicates
      const newApplyBtn = applyBtn.cloneNode(true);
      applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);

      const newCancelBtn = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

      const newSaveTemplateBtn = saveTemplateBtn.cloneNode(true);
      saveTemplateBtn.parentNode.replaceChild(newSaveTemplateBtn, saveTemplateBtn);

      const newTemplateSelect = templateSelect.cloneNode(true);
      templateSelect.parentNode.replaceChild(newTemplateSelect, templateSelect);

      // Add new listeners
      newApplyBtn.addEventListener('click', applyMapping);
      newCancelBtn.addEventListener('click', closeModal);
      newCloseBtn.addEventListener('click', closeModal);
      overlay.addEventListener('click', closeModal);

      newTemplateSelect.addEventListener('change', (e) => {
        const templateId = e.target.value;
        if (templateId && this.csvMapper.templates[templateId]) {
          this.csvMapper.currentMapping = this.csvMapper.templates[templateId].mapping;
        } else {
          this.csvMapper.currentMapping = this.csvMapper.suggestMapping(headers);
        }
        this.populateMappingModal();
      });

      newSaveTemplateBtn.addEventListener('click', () => {
        const name = prompt('Nome do Template:');
        if (name) {
          const mapping = this.getMappingFromUI();
          const id = name.toLowerCase().replace(/\s+/g, '_');
          this.csvMapper.saveTemplate(id, { name, mapping });

          // Update select
          const option = document.createElement('option');
          option.value = id;
          option.textContent = name;
          newTemplateSelect.appendChild(option);
          newTemplateSelect.value = id;

          alert('Template salvo com sucesso!');
        }
      });
    });
  }

  populateMappingModal() {
    const grid = document.getElementById('mapping-grid');
    grid.innerHTML = '';

    const fields = [
      { key: 'campaignName', label: 'Nome da Campanha', required: true },
      { key: 'date', label: 'Data', required: true },
      { key: 'sent', label: 'Enviados / Impressões', required: true },
      { key: 'opens', label: 'Aberturas / Engajamento', required: false },
      { key: 'clicks', label: 'Cliques', required: false },
      { key: 'conversions', label: 'Conversões', required: false },
      { key: 'revenue', label: 'Receita / Custo', required: false },
      { key: 'engagementType', label: 'Tipo (Email/Auto)', required: false }
    ];

    fields.forEach(field => {
      const row = document.createElement('div');
      row.className = 'mapping-row';

      const label = document.createElement('div');
      label.className = `mapping-label ${field.required ? 'required' : ''}`;
      label.textContent = field.label;

      const select = document.createElement('select');
      select.className = 'filter-select mapping-select';
      select.dataset.key = field.key;

      // Add empty option
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = '-- Selecione a coluna --';
      select.appendChild(emptyOption);

      // Add column options
      this.currentFile.headers.forEach(header => {
        const option = document.createElement('option');
        option.value = header;
        option.textContent = header;

        // Pre-select if matches current mapping
        if (this.csvMapper.currentMapping && this.csvMapper.currentMapping[field.key] === header) {
          option.selected = true;
        }

        select.appendChild(option);
      });

      row.appendChild(label);
      row.appendChild(select);
      grid.appendChild(row);
    });
  }

  getMappingFromUI() {
    const mapping = {};
    document.querySelectorAll('.mapping-select').forEach(select => {
      if (select.value) {
        mapping[select.dataset.key] = select.value;
      }
    });
    return mapping;
  }

  updateMappingPreview() {
    const previewDiv = document.getElementById('data-preview');
    const table = document.createElement('table');
    table.className = 'preview-table';

    // Header
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    this.currentFile.headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    // Body (first 3 rows)
    const tbody = document.createElement('tbody');
    this.currentFile.sampleData.slice(0, 3).forEach(row => {
      const tr = document.createElement('tr');
      this.currentFile.headers.forEach(header => {
        const td = document.createElement('td');
        td.textContent = row[header] || '';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    previewDiv.innerHTML = '';
    previewDiv.appendChild(table);
  }

  async parseCSV(file) {
    console.log('Starting parseCSV for:', file.name);
    return new Promise((resolve) => {
      try {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            console.log('Papa Parse complete. Errors:', results.errors.length, 'Rows:', results.data.length);
            if (results.errors.length > 0) {
              console.warn('CSV parsing errors:', results.errors);
            }

            const headers = results.meta.fields;
            const data = results.data;

            if (!headers || headers.length === 0) {
              alert('Erro: O arquivo CSV não possui cabeçalhos identificáveis.');
              resolve();
              return;
            }

            try {
              // Check if we can auto-detect a template
              console.log('Auto-detecting template...');
              const detectedTemplateId = this.csvMapper.autoDetectTemplate(headers);
              let mapping = null;

              if (detectedTemplateId) {
                console.log(`Using auto-detected template: ${detectedTemplateId}`);
                mapping = this.csvMapper.templates[detectedTemplateId].mapping;
              } else {
                // Show mapping modal
                console.log('No template detected, showing modal...');
                mapping = await this.showMappingModal(file, headers, data);
                console.log('Modal closed. Mapping:', mapping);
              }

              if (mapping) {
                const campaigns = this.processParsedData(data, file.name, headers, mapping);

                if (campaigns.length === 0) {
                  alert('Aviso: Nenhuma campanha foi identificada no arquivo. Verifique se o CSV possui cabeçalhos e dados válidos.');
                } else {
                  alert(`${campaigns.length} campanhas importadas com sucesso!`);
                  this.campaigns.push(...campaigns);
                }
              }
            } catch (err) {
              console.error('Error processing CSV data:', err);
              alert('Erro ao processar dados do CSV: ' + err.message);
            }

            resolve();
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
            alert('Erro ao ler o arquivo CSV: ' + error.message);
            resolve();
          }
        });
      } catch (e) {
        console.error('Error initiating Papa Parse:', e);
        alert('Erro ao iniciar leitura do CSV: ' + e.message);
        resolve();
      }
    });
  }

  processParsedData(data, filename, headers, mapping = null) {
    const campaigns = [];

    // Normalize headers to lowercase for detection
    const lowerHeaders = headers.map(h => h.toLowerCase());
    const crmName = this.detectCRM(filename, lowerHeaders);

    console.log('Processing data from:', filename);
    console.log('Detected CRM:', crmName);
    console.log('Using mapping:', mapping);

    data.forEach((row, index) => {
      // Create a normalized row object where keys are lowercase for easier matching
      // If mapping is provided, we use the raw keys from the mapping
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        normalizedRow[key.toLowerCase()] = row[key];
      });

      const campaign = this.mapCSVRow(row, normalizedRow, crmName, mapping);

      if (index === 0) {
        console.log('Mapped campaign:', campaign);
      }

      if (campaign.name) {
        campaigns.push(campaign);
      } else {
        console.warn('Campaign skipped (no name):', row);
      }
    });

    console.log('Total campaigns processed:', campaigns.length);
    return campaigns;
  }

  // Modified to accept object instead of array
  mapCSVRow(rawRow, normalizedRow, crm, mapping) {
    let campaignName, engagementType, date, sent, opens, clicks, conversions, revenue;

    if (mapping) {
      // Use dynamic mapping
      campaignName = rawRow[mapping.campaignName];
      engagementType = mapping.engagementType ? rawRow[mapping.engagementType] : 'email';
      date = rawRow[mapping.date];
      sent = this.parseNumber(rawRow[mapping.sent]);
      opens = mapping.opens ? this.parseNumber(rawRow[mapping.opens]) : 0;
      clicks = mapping.clicks ? this.parseNumber(rawRow[mapping.clicks]) : 0;
      conversions = mapping.conversions ? this.parseNumber(rawRow[mapping.conversions]) : 0;
      revenue = mapping.revenue ? this.parseNumber(rawRow[mapping.revenue]) : 0;
    } else {
      // Legacy fallback (should rarely be reached now)
      campaignName = this.findValue(normalizedRow, ['titulo', 'campanha', 'nome', 'name', 'campaign', 'título', 'title']);
      engagementType = this.findValue(normalizedRow, ['campanha', 'jornada', 'engagement']);
      date = this.findValue(normalizedRow, ['data', 'date', 'data_envio', 'send_date', 'created']);
      sent = this.parseNumber(this.findValue(normalizedRow, ['envio', 'emails_enviados', 'enviados', 'sent', 'emails_sent', 'total_sent']));
      opens = this.parseNumber(this.findValue(normalizedRow, ['aberto', 'aberturas', 'opens', 'unique_opens', 'abertos']));
      clicks = this.parseNumber(this.findValue(normalizedRow, ['clique', 'cliques', 'clicks', 'unique_clicks']));
      conversions = this.parseNumber(this.findValue(normalizedRow, ['pedido', 'conversões', 'conversions', 'conversoes', 'converted']));
      revenue = this.parseNumber(this.findValue(normalizedRow, ['receita', 'revenue', 'valor', 'value']));
    }

    // Map common column names to standard format
    const campaign = {
      id: Date.now() + Math.random(),
      name: campaignName,
      engagementType: engagementType,
      crm: crm,
      date: date,
      sent: sent,
      delivered: sent, // Assuming delivered = sent if not specified
      opens: opens,
      totalOpens: opens,
      clicks: clicks,
      totalClicks: clicks,
      conversions: conversions,
      revenue: revenue,
      status: 'completed',
      type: this.detectCampaignTypeFromEngagement(engagementType, campaignName)
    };

    // Calculate derived metrics
    const delivered = campaign.delivered || campaign.sent;
    campaign.openRate = delivered > 0 ? (campaign.opens / delivered) * 100 : 0;
    campaign.clickRate = delivered > 0 ? (campaign.clicks / delivered) * 100 : 0;
    campaign.conversionRate = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;

    return campaign;
  }

  detectCRM(filename, headers) {
    const fn = filename.toLowerCase();

    if (fn.includes('edrone')) return 'Edrone';
    if (fn.includes('sendinblue') || fn.includes('sendinpulse')) return 'Sendinpulse';
    if (fn.includes('rd') || fn.includes('rdstation')) return 'RD Station';
    if (fn.includes('mailchimp')) return 'Mailchimp';
    if (fn.includes('hubspot')) return 'HubSpot';

    // Try to detect from headers
    if (headers.some(h => h.includes('edrone'))) return 'Edrone';
    if (headers.some(h => h.includes('sendinblue'))) return 'Sendinpulse';
    if (headers.some(h => h.includes('rd'))) return 'RD Station';

    return 'Outro';
  }

  findValue(row, possibleKeys) {
    // First try exact matches
    for (const key of possibleKeys) {
      if (row[key] !== undefined) {
        return row[key];
      }
    }

    // Then try partial matches (contains)
    for (const key of possibleKeys) {
      for (const rowKey in row) {
        if (rowKey.includes(key)) {
          return row[rowKey];
        }
      }
    }
    return '';
  }

  parseNumber(value) {
    if (!value) return 0;
    let str = String(value).trim();

    // Check if it has both . and ,
    if (str.includes('.') && str.includes(',')) {
      const lastDot = str.lastIndexOf('.');
      const lastComma = str.lastIndexOf(',');

      if (lastDot > lastComma) {
        // US Format: 1,234.56 -> Remove commas
        str = str.replace(/,/g, '');
      } else {
        // BR/EU Format: 1.234,56 -> Remove dots, replace comma with dot
        str = str.replace(/\./g, '').replace(',', '.');
      }
    } else if (str.includes(',')) {
      // Only comma: 1234,56 -> Replace with dot
      str = str.replace(',', '.');
    }
    // If only dot, assume it's already correct (1234.56) or integer (1234)

    // Remove any remaining non-numeric chars (except dot and minus)
    str = str.replace(/[^\d.-]/g, '');

    return parseFloat(str) || 0;
  }

  detectCampaignType(name) {
    const nameLower = name.toLowerCase();

    // Keywords for automation
    const automationKeywords = [
      'automação', 'automation', 'fluxo', 'flow', 'workflow',
      'carrinho abandonado', 'abandoned cart', 'boas vindas', 'welcome',
      'reengajamento', 're-engagement', 'aniversário', 'birthday',
      'pós-compra', 'post-purchase', 'recuperação', 'recovery'
    ];

    // Keywords for email marketing
    const emailKeywords = [
      'newsletter', 'campanha', 'campaign', 'promoção', 'promotion',
      'lançamento', 'launch', 'black friday', 'cyber monday',
      'desconto', 'discount', 'oferta', 'offer'
    ];

    // Check for automation keywords first (more specific)
    if (automationKeywords.some(keyword => nameLower.includes(keyword))) {
      return 'automation';
    }

    // Check for email marketing keywords
    if (emailKeywords.some(keyword => nameLower.includes(keyword))) {
      return 'email';
    }

    // Default to email if no clear indicator
    return 'email';
  }

  detectCampaignTypeFromEngagement(engagementType, campaignName) {
    if (!engagementType) {
      // Fallback to old detection method
      return this.detectCampaignType(campaignName);
    }

    const engagementLower = engagementType.toLowerCase();

    // Special case: newsletter_subscription is automation
    if (engagementLower.includes('newsletter_subscription')) {
      return 'automation';
    }

    // newsletter (except newsletter_subscription) is email marketing
    if (engagementLower.includes('newsletter')) {
      return 'email';
    }

    // SMS detection
    if (engagementLower.includes('sms')) {
      return 'sms';
    }

    // Everything else is automation
    return 'automation';
  }

  // ============================================
  // DATA MANAGEMENT
  // ============================================
  saveDataToStorage() {
    localStorage.setItem('marketing_campaigns', JSON.stringify(this.campaigns));
  }

  loadDataFromStorage() {
    const stored = localStorage.getItem('marketing_campaigns');
    if (stored) {
      this.campaigns = JSON.parse(stored);
    }
  }

  clearAllData() {
    console.log('Clearing all data...');
    this.campaigns = [];
    localStorage.removeItem('marketing_campaigns');

    // Hide dashboard sections
    const sections = [
      'metrics-section', 'executive-summary-section', 'insights-section',
      'monthly-section', 'filters-section', 'charts-section', 'revenue-section'
    ];

    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    // Show upload section
    const uploadSection = document.getElementById('upload-section');
    if (uploadSection) {
      uploadSection.classList.remove('hidden');
      console.log('Upload section shown');
    } else {
      console.error('Upload section not found!');
    }

    // Destroy charts
    Object.values(this.charts).forEach(chart => {
      if (chart) chart.destroy();
    });
    this.charts = {};

    // Optional: Reload page to ensure clean state if needed
    // location.reload();
  }

  // ============================================
  // THEME
  // ============================================
  setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    this.updateThemeIcon(newTheme);
  }

  updateThemeIcon(theme) {
    const icon = document.querySelector('#theme-toggle .material-symbols-outlined');
    icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
  }

  // ============================================
  // DISPLAY MANAGEMENT
  // ============================================
  showDashboard() {
    console.log('showDashboard called');
    console.log('Total campaigns:', this.campaigns.length);
    if (this.campaigns.length > 0) {
      console.log('Sample campaign:', this.campaigns[0]);
    }

    try {
      document.getElementById('upload-section').classList.add('hidden');
      document.getElementById('metrics-section').classList.remove('hidden');
      document.getElementById('executive-summary-section').classList.remove('hidden');
      document.getElementById('insights-section').classList.remove('hidden');
      document.getElementById('revenue-section').classList.remove('hidden');
      document.getElementById('monthly-section').classList.remove('hidden');
      document.getElementById('filters-section').classList.remove('hidden');
      document.getElementById('charts-section').classList.remove('hidden');

      console.log('Rendering metrics...');
      this.renderMetrics();
      console.log('Rendering executive summary...');
      this.renderExecutiveSummary();
      console.log('Rendering insights...');
      this.renderInsights();
      console.log('Rendering monthly analysis...');
      this.renderMonthlyAnalysis();
      console.log('Rendering charts...');
      this.renderCharts();
      console.log('Rendering table...');
      this.renderTable();
    } catch (error) {
      console.error('Error rendering dashboard:', error);
      alert('Erro ao renderizar o dashboard: ' + error.message);
    }
  }

  // ============================================
  // METRICS
  // ============================================
  renderMetrics() {
    const filtered = this.getFilteredCampaigns();

    const metrics = [
      {
        label: 'Total de Campanhas',
        value: filtered.length,
        icon: '📧',
        gradient: 'var(--gradient-primary)'
      },
      {
        label: 'Taxa de Abertura Média',
        value: this.calculateAverage(filtered, 'openRate').toFixed(1) + '%',
        icon: '📬',
        gradient: 'var(--gradient-success)'
      },
      {
        label: 'CTR Médio',
        value: this.calculateAverage(filtered, 'clickRate').toFixed(2) + '%',
        icon: '👆',
        gradient: 'var(--gradient-secondary)'
      },
      {
        label: 'Total de Conversões',
        value: this.calculateSum(filtered, 'conversions').toLocaleString(),
        icon: '🎯',
        gradient: 'var(--gradient-warm)'
      },
      {
        label: 'Emails Enviados',
        value: this.calculateSum(filtered, 'sent').toLocaleString(),
        icon: '📨',
        gradient: 'var(--gradient-primary)'
      },
      {
        label: 'Receita Total',
        value: 'R$ ' + this.calculateSum(filtered, 'revenue').toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        icon: '💰',
        gradient: 'var(--gradient-warm)'
      }
    ];

    const grid = document.getElementById('metrics-grid');
    grid.innerHTML = metrics.map(metric => `
      <div class="metric-card fade-in">
        <div class="metric-header">
          <span class="metric-label">${metric.label}</span>
          <div class="metric-icon" style="background: ${metric.gradient}">
            ${metric.icon}
          </div>
        </div>
        <div class="metric-value">${metric.value}</div>
      </div>
    `).join('');
  }

  calculateAverage(campaigns, field) {
    if (campaigns.length === 0) return 0;
    return campaigns.reduce((sum, c) => sum + (c[field] || 0), 0) / campaigns.length;
  }

  calculateSum(campaigns, field) {
    return campaigns.reduce((sum, c) => sum + (c[field] || 0), 0);
  }

  // ============================================
  // EXECUTIVE SUMMARY
  // ============================================
  renderExecutiveSummary() {
    const filtered = this.getFilteredCampaigns();
    if (filtered.length === 0) return;

    const summary = {
      totalCampaigns: filtered.length,
      totalSent: this.calculateSum(filtered, 'sent'),
      avgOpenRate: this.calculateAverage(filtered, 'openRate'),
      avgClickRate: this.calculateAverage(filtered, 'clickRate'),
      totalConversions: this.calculateSum(filtered, 'conversions'),
      totalRevenue: this.calculateSum(filtered, 'revenue')
    };

    const bestCampaign = [...filtered].sort((a, b) => b.openRate - a.openRate)[0];

    // Generate Tips
    const tips = this.generateTips(filtered);

    const card = document.getElementById('executive-summary-card');
    card.innerHTML = `
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">Total de Campanhas</div>
          <div class="summary-value">${summary.totalCampaigns}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Emails Enviados</div>
          <div class="summary-value">${summary.totalSent.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Taxa de Abertura Média</div>
          <div class="summary-value">${summary.avgOpenRate.toFixed(1)}%</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">CTR Médio</div>
          <div class="summary-value">${summary.avgClickRate.toFixed(2)}%</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Conversões Totais</div>
          <div class="summary-value">${summary.totalConversions.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Receita Total</div>
          <div class="summary-value">R$ ${summary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>
      
      <div class="summary-highlights">
        <div class="summary-highlight">
          <h4 class="summary-highlight-title">
            <span class="material-symbols-outlined">emoji_events</span>
            O que mais deu certo
          </h4>
          <p class="summary-highlight-text">
            A campanha <strong>"${bestCampaign.name}"</strong> foi o destaque do mês, alcançando uma taxa de abertura de <strong>${bestCampaign.openRate.toFixed(1)}%</strong> e <strong>${bestCampaign.clicks.toLocaleString()}</strong> cliques.
            ${bestCampaign.revenue > 0 ? `Gerou uma receita de <strong>R$ ${bestCampaign.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>.` : ''}
          </p>
        </div>

        <div class="summary-highlight tips">
          <h4 class="summary-highlight-title">
            <span class="material-symbols-outlined">lightbulb</span>
            Dicas para o próximo mês
          </h4>
          <ul class="summary-highlight-text" style="list-style-position: inside; margin-top: 0.5rem;">
            ${tips.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  generateTips(campaigns) {
    const tips = [];
    const avgOpen = this.calculateAverage(campaigns, 'openRate');
    const avgClick = this.calculateAverage(campaigns, 'clickRate');

    if (avgOpen < 20) {
      tips.push("Teste linhas de assunto mais curtas e personalizadas para aumentar a abertura.");
    } else {
      tips.push("Mantenha o estilo das linhas de assunto atuais, pois estão performando bem.");
    }

    if (avgClick < 2) {
      tips.push("Revise seus CTAs (Chamadas para Ação). Tente usar cores contrastantes e textos mais diretos.");
    }

    // Day of week analysis (simple heuristic)
    const days = {};
    campaigns.forEach(c => {
      if (c.date) {
        const date = new Date(c.date);
        if (!isNaN(date)) {
          const day = date.toLocaleDateString('pt-BR', { weekday: 'long' });
          if (!days[day]) days[day] = { count: 0, opens: 0 };
          days[day].count++;
          days[day].opens += c.openRate;
        }
      }
    });

    let bestDay = '';
    let maxAvg = 0;
    for (const [day, data] of Object.entries(days)) {
      const avg = data.opens / data.count;
      if (avg > maxAvg) {
        maxAvg = avg;
        bestDay = day;
      }
    }

    if (bestDay) {
      tips.push(`Seus emails enviados na <strong>${bestDay}</strong> tendem a ter melhor abertura.`);
    }

    if (tips.length < 3) {
      tips.push("Segmente sua base de contatos para enviar conteúdo mais relevante.");
    }

    return tips.slice(0, 3);
  }

  copySummaryToClipboard() {
    const filtered = this.getFilteredCampaigns();
    if (filtered.length === 0) return;

    const bestCampaign = [...filtered].sort((a, b) => b.openRate - a.openRate)[0];
    const tips = this.generateTips(filtered);

    const text = `
📊 RESUMO EXECUTIVO - Marketing Analytics

📧 Total de Campanhas: ${filtered.length}
📨 Emails Enviados: ${this.calculateSum(filtered, 'sent').toLocaleString()}
📬 Taxa de Abertura Média: ${this.calculateAverage(filtered, 'openRate').toFixed(1)}%
👆 CTR Médio: ${this.calculateAverage(filtered, 'clickRate').toFixed(2)}%
🎯 Conversões Totais: ${this.calculateSum(filtered, 'conversions').toLocaleString()}
💰 Receita Total: R$ ${this.calculateSum(filtered, 'revenue').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

🏆 Destaque do Mês:
Campanha: ${bestCampaign.name}
Taxa de Abertura: ${bestCampaign.openRate.toFixed(1)}%

💡 Dicas para o próximo mês:
${tips.map(t => `- ${t.replace(/<[^>]*>/g, '')}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      alert('Resumo copiado para a área de transferência!');
    });
  }

  // ============================================
  // FILTERS
  // ============================================


  getFilteredCampaigns() {
    const filtered = this.campaigns.filter(campaign => {
      // Date range filter
      if (this.currentFilters.dateRange !== 'all') {
        const campaignDate = new Date(campaign.date);
        const daysAgo = parseInt(this.currentFilters.dateRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

        if (campaignDate < cutoffDate) {
          return false;
        }
      }

      // Status filter
      if (this.currentFilters.status !== 'all') {
        const status = campaign.status.toLowerCase();
        if (!status.includes(this.currentFilters.status)) {
          return false;
        }
      }

      // Search filter
      if (this.currentFilters.search) {
        const searchLower = this.currentFilters.search;
        const nameMatch = campaign.name.toLowerCase().includes(searchLower);
        const crmMatch = campaign.crm.toLowerCase().includes(searchLower);

        if (!nameMatch && !crmMatch) {
          return false;
        }
      }

      // Campaign type filter
      if (this.currentFilters.campaignType !== 'all' && campaign.type !== this.currentFilters.campaignType) {
        return false;
      }

      return true;
    });

    console.log('Filtered campaigns count:', filtered.length);
    return filtered;
  }

  applyFilters() {
    this.renderMetrics();
    this.renderInsights();
    this.renderRevenueByChannel();
    this.renderMonthlyAnalysis();
    this.renderCharts();
    this.renderTable();
  }

  // ============================================
  // CHARTS
  // ============================================
  renderCharts() {
    this.renderTimelineChart();
    this.renderFunnelChart();
    this.renderTopCampaignsChart();
  }

  renderTimelineChart() {
    const ctx = document.getElementById('timeline-chart');
    if (!ctx) return;

    const filtered = this.getFilteredCampaigns();

    // Group by month (YYYY-MM) instead of day
    const monthGroups = {};
    filtered.forEach(campaign => {
      if (!campaign.date) return;

      const date = new Date(campaign.date);
      if (isNaN(date)) return;

      // Format as YYYY-MM
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = { opens: 0, clicks: 0, conversions: 0 };
      }
      monthGroups[monthKey].opens += campaign.opens;
      monthGroups[monthKey].clicks += campaign.clicks;
      monthGroups[monthKey].conversions += campaign.conversions;
    });

    const months = Object.keys(monthGroups).sort();
    const metric = document.getElementById('timeline-metric')?.value || 'opens';

    if (this.charts.timeline) {
      this.charts.timeline.destroy();
    }

    this.charts.timeline = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months.map(m => this.formatMonth(m)),
        datasets: [{
          label: this.getMetricLabel(metric),
          data: months.map(month => monthGroups[month][metric]),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: this.getChartOptions()
    });
  }

  updateTimelineChart() {
    this.renderTimelineChart();
  }

  renderFunnelChart() {
    const ctx = document.getElementById('funnel-chart');
    if (!ctx) return;

    const filtered = this.getFilteredCampaigns();

    const sent = this.calculateSum(filtered, 'sent');
    const opens = this.calculateSum(filtered, 'opens');
    const clicks = this.calculateSum(filtered, 'clicks');
    const conversions = this.calculateSum(filtered, 'conversions');

    if (this.charts.funnel) {
      this.charts.funnel.destroy();
    }

    this.charts.funnel = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Enviados', 'Abertos', 'Cliques', 'Conversões'],
        datasets: [{
          label: 'Quantidade',
          data: [sent, opens, clicks, conversions],
          backgroundColor: [
            'rgba(99, 102, 241, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(236, 72, 153, 0.8)',
            'rgba(16, 185, 129, 0.8)'
          ]
        }]
      },
      options: {
        ...this.getChartOptions(),
        indexAxis: 'y'
      }
    });
  }

  renderTopCampaignsChart() {
    const ctx = document.getElementById('top-campaigns-chart');
    if (!ctx) return;

    const filtered = this.getFilteredCampaigns();

    // Filter only email marketing campaigns
    const emailCampaigns = filtered.filter(c => c.type === 'email');

    // Group by campaign name and aggregate metrics
    const grouped = {};
    emailCampaigns.forEach(campaign => {
      if (!grouped[campaign.name]) {
        grouped[campaign.name] = {
          name: campaign.name,
          sent: 0,
          opens: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          count: 0
        };
      }
      grouped[campaign.name].sent += campaign.sent;
      grouped[campaign.name].opens += campaign.opens;
      grouped[campaign.name].clicks += campaign.clicks;
      grouped[campaign.name].conversions += campaign.conversions;
      grouped[campaign.name].revenue += campaign.revenue;
      grouped[campaign.name].count++;
    });

    // Calculate rates for grouped campaigns
    const groupedArray = Object.values(grouped).map(g => ({
      ...g,
      openRate: g.sent > 0 ? (g.opens / g.sent) * 100 : 0,
      clickRate: g.sent > 0 ? (g.clicks / g.sent) * 100 : 0
    }));

    const metric = document.getElementById('top-campaigns-metric')?.value || 'openRate';
    const sorted = groupedArray.sort((a, b) => b[metric] - a[metric]).slice(0, 10);

    if (this.charts.topCampaigns) {
      this.charts.topCampaigns.destroy();
    }

    this.charts.topCampaigns = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(c => c.name.substring(0, 40)),
        datasets: [{
          label: this.getMetricLabel(metric),
          data: sorted.map(c => c[metric]),
          backgroundColor: 'rgba(99, 102, 241, 0.8)'
        }]
      },
      options: this.getChartOptions()
    });
  }

  updateTopCampaignsChart() {
    this.renderTopCampaignsChart();
  }

  updateMonthlyChart() {
    this.renderMonthlyAnalysis();
  }


  getChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: getComputedStyle(document.documentElement)
              .getPropertyValue('--text-primary').trim()
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: getComputedStyle(document.documentElement)
              .getPropertyValue('--text-secondary').trim()
          },
          grid: {
            color: getComputedStyle(document.documentElement)
              .getPropertyValue('--border-color').trim()
          }
        },
        y: {
          ticks: {
            color: getComputedStyle(document.documentElement)
              .getPropertyValue('--text-secondary').trim()
          },
          grid: {
            color: getComputedStyle(document.documentElement)
              .getPropertyValue('--border-color').trim()
          }
        }
      }
    };
  }

  getMetricLabel(metric) {
    const labels = {
      opens: 'Aberturas',
      clicks: 'Cliques',
      conversions: 'Conversões',
      openRate: 'Taxa de Abertura (%)',
      clickRate: 'CTR (%)',
      sent: 'Enviados'
    };
    return labels[metric] || metric;
  }

  // ============================================
  // INSIGHTS GENERATION
  // ============================================
  renderInsights() {
    const filtered = this.getFilteredCampaigns();
    const insights = this.generateInsights(filtered);

    const grid = document.getElementById('insights-grid');
    grid.innerHTML = insights.map(insight => `
      <div class="insight-card ${insight.type} fade-in">
        <div class="insight-header">
          <span class="insight-icon">${insight.icon}</span>
          <h3 class="insight-title">${insight.title}</h3>
        </div>
        <p class="insight-text">${insight.text}</p>
      </div>
    `).join('');
  }

  renderRevenueByChannel() {
    const filtered = this.getFilteredCampaigns();

    // Group revenue by type
    const revenueByType = {
      email: 0,
      automation: 0,
      sms: 0
    };

    filtered.forEach(campaign => {
      const type = campaign.type || 'email';
      if (revenueByType[type] !== undefined) {
        revenueByType[type] += campaign.revenue || 0;
      }
    });

    console.log('Revenue by Type:', revenueByType);
    const total = Object.values(revenueByType).reduce((a, b) => a + b, 0);

    const channels = [
      { type: 'email', label: 'Email Marketing', icon: '📧', color: '#6366f1' },
      { type: 'automation', label: 'Automação', icon: '🤖', color: '#8b5cf6' },
      { type: 'sms', label: 'SMS', icon: '📱', color: '#ec4899' }
    ];

    const grid = document.getElementById('revenue-channels-grid');
    grid.innerHTML = channels.map(channel => {
      const revenue = revenueByType[channel.type];
      const percentage = total > 0 ? (revenue / total) * 100 : 0;

      return `
        <div class="revenue-channel-card" style="border-left: 4px solid ${channel.color}">
          <div class="revenue-channel-header">
            <span class="revenue-channel-icon">${channel.icon}</span>
            <h3 class="revenue-channel-title">${channel.label}</h3>
          </div>
          <div class="revenue-channel-amount">
            R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div class="revenue-channel-bar">
            <div class="revenue-channel-fill" style="width: ${percentage}%; background: ${channel.color}"></div>
          </div>
          <div class="revenue-channel-percentage">
            ${percentage.toFixed(1)}% do total
          </div>
        </div>
      `;
    }).join('');
  }


  generateInsights(campaigns) {
    if (campaigns.length === 0) return [];

    const insights = [];

    // Separate by type
    const emailCampaigns = campaigns.filter(c => c.type === 'email');
    const automationCampaigns = campaigns.filter(c => c.type === 'automation');

    // Best performing campaign
    const bestCampaign = [...campaigns].sort((a, b) => b.openRate - a.openRate)[0];
    if (bestCampaign) {
      insights.push({
        type: 'positive',
        icon: '🏆',
        title: 'Melhor Desempenho',
        text: `A campanha "${bestCampaign.name}" teve a melhor taxa de abertura com <span class="insight-highlight">${bestCampaign.openRate.toFixed(1)}%</span>, superando a média de ${this.calculateAverage(campaigns, 'openRate').toFixed(1)}%.`
      });
    }

    // REMOVED: Email vs Automation comparison

    // Conversion rate insight
    const avgConversionRate = this.calculateAverage(campaigns, 'conversionRate');
    if (avgConversionRate > 0) {
      const conversionType = avgConversionRate > 5 ? 'positive' : avgConversionRate > 2 ? 'neutral' : 'negative';
      insights.push({
        type: conversionType,
        icon: '🎯',
        title: 'Taxa de Conversão',
        text: `A taxa média de conversão está em <span class="insight-highlight">${avgConversionRate.toFixed(2)}%</span>. ${avgConversionRate > 5 ? 'Excelente resultado!' : avgConversionRate > 2 ? 'Bom resultado, mas há espaço para melhorias.' : 'Considere otimizar suas chamadas para ação.'}`
      });
    }

    // Volume insight
    const totalSent = this.calculateSum(campaigns, 'sent');
    const totalConversions = this.calculateSum(campaigns, 'conversions');
    insights.push({
      type: 'neutral',
      icon: '📊',
      title: 'Volume Total',
      text: `Foram enviados <span class="insight-highlight">${totalSent.toLocaleString()}</span> emails, gerando <span class="insight-highlight">${totalConversions.toLocaleString()}</span> conversões em ${campaigns.length} campanhas analisadas.`
    });

    // CRM performance
    const crmPerformance = {};
    campaigns.forEach(c => {
      if (!crmPerformance[c.crm]) {
        crmPerformance[c.crm] = [];
      }
      crmPerformance[c.crm].push(c.openRate);
    });

    const crmAvgs = Object.keys(crmPerformance).map(crm => ({
      crm,
      avg: crmPerformance[crm].reduce((a, b) => a + b, 0) / crmPerformance[crm].length
    })).sort((a, b) => b.avg - a.avg);

    if (crmAvgs.length > 1) {
      const best = crmAvgs[0];
      insights.push({
        type: 'neutral',
        icon: '🔧',
        title: 'Desempenho por CRM',
        text: `${best.crm} apresenta a melhor taxa média de abertura entre os CRMs com <span class="insight-highlight">${best.avg.toFixed(1)}%</span>.`
      });
    }

    return insights;
  }

  // ============================================
  // MONTHLY ANALYSIS
  // ============================================
  renderMonthlyAnalysis() {
    const filtered = this.getFilteredCampaigns();
    const monthlyData = this.groupByMonth(filtered);

    // Render monthly cards
    const container = document.getElementById('monthly-comparison');
    const months = Object.keys(monthlyData).sort().reverse().slice(0, 4); // Last 4 months

    container.innerHTML = months.map((month, index) => {
      const data = monthlyData[month];
      const prevMonth = months[index + 1];
      const prevData = prevMonth ? monthlyData[prevMonth] : null;

      let comparisonText = '';
      if (prevData) {
        const openRateDiff = data.avgOpen - prevData.avgOpen;
        const arrow = openRateDiff > 0 ? '↑' : '↓';
        const arrowClass = openRateDiff > 0 ? 'up' : 'down';
        comparisonText = `
              <div class="monthly-comparison-text">
                <span class="comparison-arrow ${arrowClass}">${arrow}</span>
                <span>${Math.abs(openRateDiff).toFixed(1)}% vs mês anterior</span>
              </div>
            `;
      }

      return `
        <div class="monthly-card fade-in">
          <div class="monthly-header">
            <h3 class="monthly-month">${this.formatMonth(month)}</h3>
            <span class="monthly-badge">${data.count} campanhas</span>
          </div>
          <div class="monthly-stats">
            <div class="monthly-stat">
              <span class="monthly-stat-label">Taxa Abertura</span>
              <span class="monthly-stat-value">${data.avgOpen.toFixed(1)}%</span>
            </div>
            <div class="monthly-stat">
              <span class="monthly-stat-label">CTR</span>
              <span class="monthly-stat-value">${data.avgClick.toFixed(2)}%</span>
            </div>
            <div class="monthly-stat">
              <span class="monthly-stat-label">Conversões</span>
              <span class="monthly-stat-value">${data.totalConversions.toLocaleString()}</span>
            </div>
            <div class="monthly-stat">
              <span class="monthly-stat-label">Receita</span>
              <span class="monthly-stat-value">R$ ${data.totalRevenue.toLocaleString('pt-BR', { notation: 'compact' })}</span>
            </div>
          </div>
          ${comparisonText}
        </div>
      `;
    }).join('');

    this.renderMonthlyChart(monthlyData);
  }

  groupByMonth(campaigns) {
    const groups = {};
    campaigns.forEach(c => {
      if (!c.date) return;
      const date = new Date(c.date);
      if (isNaN(date)) return;

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const month = monthKey;

      if (!groups[month]) {
        groups[month] = {
          count: 0,
          opens: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          sent: 0
        };
      }

      groups[month].count++;
      groups[month].opens += c.openRate; // Summing rates to average later
      groups[month].clicks += c.clickRate;
      groups[month].conversions += c.conversions;
      groups[month].revenue += c.revenue;
      groups[month].sent += c.sent;
    });

    // Calculate averages
    Object.keys(groups).forEach(month => {
      groups[month].avgOpen = groups[month].opens / groups[month].count;
      groups[month].avgClick = groups[month].clicks / groups[month].count;
      groups[month].totalConversions = groups[month].conversions;
      groups[month].totalRevenue = groups[month].revenue;
    });

    return groups;
  }

  formatMonth(monthKey) {
    const [year, month] = monthKey.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]}/${year}`;
  }

  renderMonthlyChart(monthlyData) {
    const ctx = document.getElementById('monthly-chart');
    if (!ctx) return;

    const months = Object.keys(monthlyData).sort((a, b) => {
      // Custom sort for months if needed, but standard string sort might be okay for "Month Year" 
      // strictly speaking we should parse dates, but let's keep it simple for now
      return 0;
    });

    // Better sorting logic
    const sortedMonths = months.sort((a, b) => {
      // Extract month and year to compare dates
      // This is a simplification
      return 0;
    });

    const metric = document.getElementById('monthly-metric')?.value || 'openRate';

    const getData = (m) => {
      if (metric === 'openRate') return monthlyData[m].avgOpen;
      if (metric === 'clickRate') return monthlyData[m].avgClick;
      if (metric === 'conversions') return monthlyData[m].totalConversions;
      if (metric === 'sent') return monthlyData[m].sent;
      return 0;
    };

    if (this.charts.monthly) {
      this.charts.monthly.destroy();
    }

    this.charts.monthly = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: this.getMetricLabel(metric),
          data: months.map(m => getData(m)),
          backgroundColor: 'rgba(99, 102, 241, 0.8)',
          borderRadius: 4
        }]
      },
      options: this.getChartOptions()
    });
  }

  // ============================================
  // EXPORT & UTILS
  // ============================================
  exportChartAsImage(chartId) {
    const canvas = document.getElementById(chartId);
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${chartId}_${new Date().toISOString().split('T')[0]}.png`;
    link.href = url;
    link.click();
  }

  async exportAllCharts() {
    const charts = ['timeline-chart', 'funnel-chart', 'top-campaigns-chart', 'monthly-chart'];

    for (const chartId of charts) {
      this.exportChartAsImage(chartId);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    alert('Gráficos exportados com sucesso!');
  }

  togglePresentationMode() {
    document.body.classList.toggle('presentation-mode');

    const icon = document.querySelector('#presentation-mode-toggle .material-symbols-outlined');
    const isPresentation = document.body.classList.contains('presentation-mode');

    if (icon) {
      icon.textContent = isPresentation ? 'close_fullscreen' : 'slideshow';
    }

    if (isPresentation && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log('Fullscreen não suportado');
      });
    } else if (!isPresentation && document.fullscreenElement) {
      document.exitFullscreen();
    }
  }

  renderTable() {
    const filtered = this.getFilteredCampaigns();
    const tbody = document.getElementById('campaigns-tbody');

    tbody.innerHTML = filtered.map(campaign => `
      <tr>
        <td><strong>${campaign.name}</strong></td>
        <td><span class="badge badge-info">${campaign.crm}</span></td>
        <td>${campaign.date}</td>
        <td>${campaign.sent.toLocaleString()}</td>
        <td>${campaign.opens.toLocaleString()}</td>
        <td>${campaign.openRate.toFixed(1)}%</td>
        <td>${campaign.clicks.toLocaleString()}</td>
        <td>${campaign.clickRate.toFixed(2)}%</td>
        <td>${campaign.conversions.toLocaleString()}</td>
        <td>${this.getStatusBadge(campaign.status)}</td>
      </tr>
    `).join('');
  }

  getStatusBadge(status) {
    const statusLower = status.toLowerCase();

    if (statusLower.includes('active') || statusLower.includes('ativa')) {
      return '<span class="badge badge-success">Ativa</span>';
    } else if (statusLower.includes('paused') || statusLower.includes('pausada')) {
      return '<span class="badge badge-warning">Pausada</span>';
    } else {
      return '<span class="badge badge-info">Concluída</span>';
    }
  }

  // ============================================
  // EXPORT
  // ============================================
  exportReport() {
    alert('Funcionalidade de exportação de relatório em PDF será implementada em breve!');
  }

  exportCSV() {
    const filtered = this.getFilteredCampaigns();

    const headers = ['Campanha', 'CRM', 'Data', 'Enviados', 'Aberturas', 'Taxa Abertura', 'Cliques', 'CTR', 'Conversões', 'Status'];
    const rows = filtered.map(c => [
      c.name,
      c.crm,
      c.date,
      c.sent,
      c.opens,
      c.openRate.toFixed(2) + '%',
      c.clicks,
      c.clickRate.toFixed(2) + '%',
      c.conversions,
      c.status
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campanhas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

// ============================================
// INITIALIZE APP
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new MarketingDashboard();
});


