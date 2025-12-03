// ============================================
// MARKETING ANALYTICS DASHBOARD
// Main Application Logic - FULLY CORRECTED
// ============================================

class CSVMapper {
  constructor() {
    this.templates = this.loadTemplates();
    this.currentMapping = null;
  }

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
        }
      }
    };
  }

  loadTemplates() {
    const defaultTemplates = this.getDefaultTemplates();
    try {
      const stored = localStorage.getItem('csv_mapping_templates');
      if (stored) {
        const customTemplates = JSON.parse(stored);
        return { ...defaultTemplates, ...customTemplates };
      }
    } catch (e) {
      console.error('Error loading templates:', e);
    }
    return defaultTemplates;
  }

  saveTemplate(templateId, template) {
    try {
      let customTemplates = {};
      const stored = localStorage.getItem('csv_mapping_templates');
      if (stored) {
        customTemplates = JSON.parse(stored);
      }
      customTemplates[templateId] = template;
      localStorage.setItem('csv_mapping_templates', JSON.stringify(customTemplates));
      this.templates = this.loadTemplates();
    } catch (e) {
      console.error('Error saving template:', e);
    }
  }

  detectColumnTypes(headers, sampleRows) {
    const types = {};
    headers.forEach(header => {
      const values = sampleRows.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== '');
      
      if (values.length === 0) {
        types[header] = 'unknown';
        return;
      }

      const dateCount = values.filter(v => this.isDate(v)).length;
      if (dateCount / values.length > 0.7) {
        types[header] = 'date';
        return;
      }

      const numberCount = values.filter(v => this.isNumber(v)).length;
      if (numberCount / values.length > 0.7) {
        types[header] = 'number';
        return;
      }

      types[header] = 'text';
    });

    return types;
  }

  isDate(value) {
    if (!value) return false;
    const str = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return true;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return true;
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) return true;
    const date = new Date(str);
    return !isNaN(date.getTime()) && str.length > 5;
  }

  isNumber(value) {
    if (value === null || value === undefined || value === '') return false;
    const str = String(value).trim();
    const cleaned = str.replace(/[,.]/g, '').replace(/[^\d.-]/g, '');
    return !isNaN(cleaned) && cleaned !== '';
  }

  suggestMapping(headers) {
    const normalized = headers.map(h => h.toLowerCase().trim());
    const suggestion = {};

    const keywords = {
      campaignName: ['campaign', 'campanha', 'nome', 'name', 'titulo', 'title'],
      date: ['date', 'data', 'day', 'dia', 'created', 'send time'],
      sent: ['sent', 'enviados', 'envio', 'impressions', 'reach', 'alcance'],
      opens: ['opens', 'aberto', 'aberturas', 'engagement', 'engajamento'],
      clicks: ['clicks', 'clique', 'cliques', 'link clicks'],
      conversions: ['conversions', 'conversoes', 'pedido', 'orders', 'purchases'],
      revenue: ['revenue', 'receita', 'valor', 'value', 'cost', 'custo']
    };

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

  autoDetectTemplate(headers) {
    const normalized = headers.map(h => h.toLowerCase().trim());
    for (const [templateId, template] of Object.entries(this.templates)) {
      const mappingValues = Object.values(template.mapping).map(v => v.toLowerCase());
      const matchCount = mappingValues.filter(value =>
        normalized.some(header => header.includes(value) || value.includes(header))
      ).length;

      if (matchCount / mappingValues.length > 0.6) {
        return templateId;
      }
    }
    return null;
  }

  validateMapping(mapping, columnTypes) {
    const errors = [];
    const required = ['campaignName', 'date', 'sent'];

    required.forEach(field => {
      if (!mapping[field]) {
        errors.push(`Campo obrigatório não mapeado: ${field}`);
      }
    });

    if (mapping.date && columnTypes[mapping.date] !== 'date') {
      errors.push(`Coluna "${mapping.date}" não parece ser uma data`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

class MarketingDashboard {
  constructor() {
    this.campaigns = [];
    this.charts = {};
    this.csvMapper = new CSVMapper();
    this.currentFilters = {
      dateRange: 'all',
      status: 'all',
      campaignType: 'all',
      search: ''
    };
    this.currentFile = null;

    this.init();
  }

  init() {
    this.loadDataFromStorage();
    this.setupEventListeners();
    this.setupTheme();

    if (this.campaigns.length > 0) {
      this.showDashboard();
    } else {
      document.getElementById('upload-section').classList.remove('hidden');
    }
  }

  setupEventListeners() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');

    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

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

    document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
    document.getElementById('clear-data-btn').addEventListener('click', () => {
      if (confirm('Tem certeza que deseja limpar todos os dados?')) {
        this.clearAllData();
      }
    });

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

    document.getElementById('search-input')?.addEventListener('input', (e) => {
      this.currentFilters.search = e.target.value.toLowerCase();
      this.renderTable();
    });

    document.getElementById('export-csv-btn')?.addEventListener('click', () => this.exportCSV());
    document.getElementById('copy-summary-btn')?.addEventListener('click', () => this.copySummaryToClipboard());
    document.getElementById('presentation-mode-toggle')?.addEventListener('click', () => this.togglePresentationMode());
    document.getElementById('export-all-charts-btn')?.addEventListener('click', () => this.exportAllCharts());

    document.getElementById('timeline-metric')?.addEventListener('change', () => this.renderTimelineChart());
    document.getElementById('top-campaigns-metric')?.addEventListener('change', () => this.renderTopCampaignsChart());
    document.getElementById('monthly-metric')?.addEventListener('change', () => this.renderMonthlyChart());
    document.getElementById('export-monthly-chart-btn')?.addEventListener('click', () => this.exportChartAsImage('monthly-chart'));

    document.querySelectorAll('.export-chart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const chartId = e.currentTarget.getAttribute('data-chart');
        this.exportChartAsImage(chartId);
      });
    });
  }

  async handleFileSelect(event) {
    try {
      const files = Array.from(event.target.files);
      if (files.length === 0) return;

      for (const file of files) {
        const fileName = file.name.toLowerCase();

        if (file.type === 'text/csv' || fileName.endsWith('.csv')) {
          await this.parseCSV(file);
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') ||
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          await this.parseXLSX(file);
        } else {
          alert(`Formato não suportado: ${file.name}`);
        }
      }

      this.saveDataToStorage();
      this.showDashboard();
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      alert('Erro ao processar o arquivo: ' + error.message);
    }
  }

  async parseCSV(file) {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          if (results.data && results.data.length > 0) {
            const headers = Object.keys(results.data[0]);
            const sampleData = results.data.slice(0, 10);
            const mapping = await this.showMappingModal(file, headers, sampleData);
            
            if (mapping) {
              const campaigns = this.processParsedData(results.data, file.name, headers, mapping);
              this.campaigns.push(...campaigns);
            }
          }
          resolve();
        },
        error: (error) => {
          console.error('Erro ao parsear CSV:', error);
          alert('Erro ao processar CSV: ' + error.message);
          resolve();
        }
      });
    });
  }

  async parseXLSX(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length > 0) {
            const headers = Object.keys(jsonData[0]);
            const sampleData = jsonData.slice(0, 10);
            const mapping = await this.showMappingModal(file, headers, sampleData);
            
            if (mapping) {
              const campaigns = this.processParsedData(jsonData, file.name, headers, mapping);
              this.campaigns.push(...campaigns);
            }
          }
          resolve();
        } catch (error) {
          console.error('Erro ao parsear XLSX:', error);
          alert('Erro ao processar XLSX: ' + error.message);
          resolve();
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  async showMappingModal(file, headers, sampleData) {
    return new Promise((resolve) => {
      const modal = document.getElementById('csv-mapping-modal');
      const overlay = document.getElementById('modal-overlay');
      const closeBtn = document.getElementById('modal-close-btn');
      const cancelBtn = document.getElementById('cancel-mapping-btn');
      const applyBtn = document.getElementById('apply-mapping-btn');
      const saveTemplateBtn = document.getElementById('save-template-btn');
      const templateSelect = document.getElementById('template-select');

      this.currentFile = { file, headers, sampleData };
      const columnTypes = this.csvMapper.detectColumnTypes(headers, sampleData);
      this.currentFile.columnTypes = columnTypes;

      const detectedTemplateId = this.csvMapper.autoDetectTemplate(headers);
      if (detectedTemplateId) {
        templateSelect.value = detectedTemplateId;
        this.csvMapper.currentMapping = this.csvMapper.templates[detectedTemplateId].mapping;
      } else {
        templateSelect.value = '';
        this.csvMapper.currentMapping = this.csvMapper.suggestMapping(headers);
      }

      this.populateMappingModal();
      this.updateMappingPreview();
      modal.classList.remove('hidden');

      const closeModal = () => {
        modal.classList.add('hidden');
        resolve(null);
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

      const newApplyBtn = applyBtn.cloneNode(true);
      applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);

      const newCancelBtn = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

      const newTemplateSelect = templateSelect.cloneNode(true);
      templateSelect.parentNode.replaceChild(newTemplateSelect, templateSelect);

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

      saveTemplateBtn.addEventListener('click', () => {
        const name = prompt('Nome do Template:');
        if (name) {
          const mapping = this.getMappingFromUI();
          const id = name.toLowerCase().replace(/\s+/g, '_');
          this.csvMapper.saveTemplate(id, { name, mapping });
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
      { key: 'revenue', label: 'Receita / Custo', required: false }
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

      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = '-- Selecione --';
      select.appendChild(emptyOption);

      this.currentFile.headers.forEach(header => {
        const option = document.createElement('option');
        option.value = header;
        option.textContent = header;

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

    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    this.currentFile.headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

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

  processParsedData(data, filename, headers, mapping) {
    const campaigns = [];
    const crmName = this.detectCRM(filename, headers);

    data.forEach((row) => {
      const campaign = this.mapCSVRow(row, crmName, mapping);
      if (campaign.name) {
        campaigns.push(campaign);
      }
    });

    return campaigns;
  }

  mapCSVRow(rawRow, crm, mapping) {
    let campaignName = rawRow[mapping.campaignName] || '';
    let date = rawRow[mapping.date] || '';
    let sent = this.parseNumber(rawRow[mapping.sent] || 0);
    let opens = mapping.opens ? this.parseNumber(rawRow[mapping.opens] || 0) : 0;
    let clicks = mapping.clicks ? this.parseNumber(rawRow[mapping.clicks] || 0) : 0;
    let conversions = mapping.conversions ? this.parseNumber(rawRow[mapping.conversions] || 0) : 0;
    let revenue = mapping.revenue ? this.parseNumber(rawRow[mapping.revenue] || 0) : 0;
    let engagementType = mapping.engagementType ? rawRow[mapping.engagementType] : 'email';

    const campaign = {
      id: Date.now() + Math.random(),
      name: campaignName,
      engagementType: engagementType,
      crm: crm,
      date: date,
      sent: sent,
      delivered: sent,
      opens: opens,
      totalOpens: opens,
      clicks: clicks,
      totalClicks: clicks,
      conversions: conversions,
      revenue: revenue,
      status: 'completed',
      type: this.detectCampaignType(campaignName)
    };

    const delivered = campaign.delivered || campaign.sent;
    campaign.openRate = delivered > 0 ? (campaign.opens / delivered) * 100 : 0;
    campaign.clickRate = delivered > 0 ? (campaign.clicks / delivered) * 100 : 0;
    campaign.conversionRate = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;

    return campaign;
  }

  detectCRM(filename, headers) {
    const fn = filename.toLowerCase();
    if (fn.includes('edrone')) return 'Edrone';
    if (fn.includes('rd') || fn.includes('rdstation')) return 'RD Station';
    if (fn.includes('mailchimp')) return 'Mailchimp';
    if (fn.includes('hubspot')) return 'HubSpot';
    return 'Outro';
  }

  parseNumber(value) {
    if (!value) return 0;
    let str = String(value).trim();

    if (str.includes('.') && str.includes(',')) {
      const lastDot = str.lastIndexOf('.');
      const lastComma = str.lastIndexOf(',');
      if (lastDot > lastComma) {
        str = str.replace(/,/g, '');
      } else {
        str = str.replace(/\./g, '').replace(',', '.');
      }
    } else if (str.includes(',')) {
      str = str.replace(',', '.');
    }

    str = str.replace(/[^\d.-]/g, '');
    return parseFloat(str) || 0;
  }

  detectCampaignType(name) {
    const nameLower = name.toLowerCase();
    const automationKeywords = ['automação', 'automation', 'fluxo', 'flow', 'carrinho abandonado', 'welcome', 'reengajamento', 'birthday'];
    
    if (automationKeywords.some(k => nameLower.includes(k))) {
      return 'automation';
    }
    return 'email';
  }

  saveDataToStorage() {
    try {
      localStorage.setItem('marketing_campaigns', JSON.stringify(this.campaigns));
    } catch (e) {
      console.error('Erro ao salvar dados:', e);
    }
  }

  loadDataFromStorage() {
    try {
      const stored = localStorage.getItem('marketing_campaigns');
      if (stored) {
        this.campaigns = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    }
  }

  clearAllData() {
    this.campaigns = [];
    try {
      localStorage.removeItem('marketing_campaigns');
    } catch (e) {
      console.error('Erro ao limpar dados:', e);
    }

    const sections = ['metrics-section', 'executive-summary-section', 'insights-section', 'monthly-section', 'filters-section', 'revenue-section'];
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    document.getElementById('upload-section').classList.remove('hidden');

    Object.values(this.charts).forEach(chart => {
      if (chart) chart.destroy();
    });
    this.charts = {};
  }

  setupTheme() {
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) {
      document.body.classList.add('dark-mode');
      document.querySelector('#theme-toggle .material-symbols-outlined').textContent = 'light_mode';
    }
  }

  toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.querySelector('#theme-toggle .material-symbols-outlined').textContent = isDark ? 'light_mode' : 'dark_mode';
  }

  showDashboard() {
    document.getElementById('upload-section').classList.add('hidden');
    document.getElementById('filters-section').classList.remove('hidden');
    document.getElementById('metrics-section').classList.remove('hidden');
    document.getElementById('executive-summary-section').classList.remove('hidden');
    document.getElementById('insights-section').classList.remove('hidden');
    document.getElementById('monthly-section').classList.remove('hidden');
    document.getElementById('revenue-section').classList.remove('hidden');

    this.applyFilters();
  }

  getFilteredCampaigns() {
    return this.campaigns.filter(campaign => {
      if (this.currentFilters.dateRange !== 'all') {
        const campaignDate = new Date(campaign.date);
        const daysAgo = parseInt(this.currentFilters.dateRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        if (campaignDate < cutoffDate) return false;
      }

      if (this.currentFilters.status !== 'all') {
        if (!campaign.status.toLowerCase().includes(this.currentFilters.status)) return false;
      }

      if (this.currentFilters.search) {
        const searchLower = this.currentFilters.search;
        if (!campaign.name.toLowerCase().includes(searchLower) && !campaign.crm.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      if (this.currentFilters.campaignType !== 'all' && campaign.type !== this.currentFilters.campaignType) {
        return false;
      }

      return true;
    });
  }

  applyFilters() {
    this.renderMetrics();
    this.renderExecutiveSummary();
    this.renderInsights();
    this.renderRevenueByChannel();
    this.renderMonthlyAnalysis();
    this.renderCharts();
    this.renderTable();
  }

  renderMetrics() {
    const filtered = this.getFilteredCampaigns();

    const metrics = [
      {
        label: 'Total de Campanhas',
        value: filtered.length,
        icon: '📧'
      },
      {
        label: 'Taxa de Abertura Média',
        value: this.calculateAverage(filtered, 'openRate').toFixed(1) + '%',
        icon: '📬'
      },
      {
        label: 'CTR Médio',
        value: this.calculateAverage(filtered, 'clickRate').toFixed(2) + '%',
        icon: '👆'
      },
      {
        label: 'Total de Conversões',
        value: this.calculateSum(filtered, 'conversions').toLocaleString(),
        icon: '🎯'
      },
      {
        label: 'Emails Enviados',
        value: this.calculateSum(filtered, 'sent').toLocaleString(),
        icon: '📨'
      },
      {
        label: 'Receita Total',
        value: 'R$ ' + this.calculateSum(filtered, 'revenue').toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        icon: '💰'
      }
    ];

    const grid = document.getElementById('metrics-grid');
    grid.innerHTML = metrics.map(metric => `
      <div class="metric-card fade-in">
        <div class="metric-header">
          <span class="metric-label">${metric.label}</span>
          <div class="metric-icon">${metric.icon}</div>
        </div>
        <div class="metric-value">${metric.value}</div>
      </div>
    `).join('');
  }

  renderExecutiveSummary() {
    const filtered = this.getFilteredCampaigns();
    if (filtered.length === 0) return;

    const bestCampaign = [...filtered].sort((a, b) => b.openRate - a.openRate)[0];
    const tips = this.generateTips(filtered);

    const card = document.getElementById('executive-summary-card');
    card.innerHTML = `
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">Total de Campanhas</div>
          <div class="summary-value">${filtered.length}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Emails Enviados</div>
          <div class="summary-value">${this.calculateSum(filtered, 'sent').toLocaleString()}</div>
        </div>
        <div>
        renderExecutiveSummary() {
    const filtered = this.getFilteredCampaigns();
    if (filtered.length === 0) return;

    const bestCampaign = [...filtered].sort((a, b) => b.openRate - a.openRate)[0];
    const tips = this.generateTips(filtered);

    const card = document.getElementById('executive-summary-card');
    card.innerHTML = `
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">Total de Campanhas</div>
          <div class="summary-value">${filtered.length}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Emails Enviados</div>
          <div class="summary-value">${this.calculateSum(filtered, 'sent').toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Taxa de Abertura Média</div>
          <div class="summary-value">${this.calculateAverage(filtered, 'openRate').toFixed(1)}%</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">CTR Médio</div>
          <div class="summary-value">${this.calculateAverage(filtered, 'clickRate').toFixed(2)}%</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Conversões Totais</div>
          <div class="summary-value">${this.calculateSum(filtered, 'conversions').toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Receita Total</div>
          <div class="summary-value">R$ ${this.calculateSum(filtered, 'revenue').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>
      
      <div class="summary-highlights">
        <div class="summary-highlight">
          <h4 class="summary-highlight-title">
            <span class="material-symbols-outlined">emoji_events</span>
            Melhor Campanha
          </h4>
          <p class="summary-highlight-text">
            <strong>"${bestCampaign.name}"</strong> - Taxa de abertura: <strong>${bestCampaign.openRate.toFixed(1)}%</strong>
          </p>
        </div>

        <div class="summary-highlight tips">
          <h4 class="summary-highlight-title">
            <span class="material-symbols-outlined">lightbulb</span>
            Dicas
          </h4>
          <ul style="margin: 0; padding-left: 1.5rem;">
            ${tips.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  generateTips(campaigns) {
    const tips = [];
    const avgOpen = this.calculateAverage(campaigns, 'openRate');

    if (avgOpen < 20) {
      tips.push('Teste linhas de assunto mais curtas e personalizadas.');
    } else {
      tips.push('Suas linhas de assunto estão performando bem, mantenha o padrão.');
    }

    const avgClick = this.calculateAverage(campaigns, 'clickRate');
    if (avgClick < 2) {
      tips.push('Revise seus CTAs para melhorar os cliques.');
    }

    if (tips.length < 3) {
      tips.push('Segmente sua base de contatos para relevância.');
    }

    return tips.slice(0, 3);
  }

  copySummaryToClipboard() {
    const filtered = this.getFilteredCampaigns();
    const text = `
📊 RESUMO EXECUTIVO - Marketing Analytics
📧 Total de Campanhas: ${filtered.length}
📨 Emails Enviados: ${this.calculateSum(filtered, 'sent').toLocaleString()}
📬 Taxa de Abertura: ${this.calculateAverage(filtered, 'openRate').toFixed(1)}%
👆 CTR Médio: ${this.calculateAverage(filtered, 'clickRate').toFixed(2)}%
🎯 Conversões: ${this.calculateSum(filtered, 'conversions').toLocaleString()}
💰 Receita: R$ ${this.calculateSum(filtered, 'revenue').toLocaleString('pt-BR')}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      alert('Resumo copiado!');
    });
  }

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

  generateInsights(campaigns) {
    const insights = [];
    const bestCampaign = [...campaigns].sort((a, b) => b.openRate - a.openRate)[0];

    if (bestCampaign) {
      insights.push({
        type: 'positive',
        icon: '🏆',
        title: 'Melhor Desempenho',
        text: `"${bestCampaign.name}" tem taxa de abertura de <strong>${bestCampaign.openRate.toFixed(1)}%</strong>`
      });
    }

    const avgConversion = this.calculateAverage(campaigns, 'conversionRate');
    insights.push({
      type: avgConversion > 5 ? 'positive' : 'neutral',
      icon: '🎯',
      title: 'Taxa de Conversão',
      text: `Taxa média: <strong>${avgConversion.toFixed(2)}%</strong>`
    });

    const totalSent = this.calculateSum(campaigns, 'sent');
    insights.push({
      type: 'neutral',
      icon: '📊',
      title: 'Volume Total',
      text: `<strong>${totalSent.toLocaleString()}</strong> emails enviados`
    });

    return insights;
  }

  renderRevenueByChannel() {
    const filtered = this.getFilteredCampaigns();

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
            R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div class="revenue-channel-bar">
            <div class="revenue-channel-fill" style="width: ${percentage}%; background: ${channel.color}"></div>
          </div>
          <div class="revenue-channel-percentage">${percentage.toFixed(1)}%</div>
        </div>
      `;
    }).join('');
  }

  renderMonthlyAnalysis() {
    const filtered = this.getFilteredCampaigns();
    const monthlyData = this.groupByMonth(filtered);

    const container = document.getElementById('monthly-comparison');
    const months = Object.keys(monthlyData).sort().reverse().slice(0, 4);

    container.innerHTML = months.map((month, index) => {
      const data = monthlyData[month];

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
              <span class="monthly-stat-value">R$ ${(data.totalRevenue / 1000).toFixed(0)}k</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.renderMonthlyChart();
  }

  groupByMonth(campaigns) {
    const groups = {};
    campaigns.forEach(c => {
      if (!c.date) return;
      const date = new Date(c.date);
      if (isNaN(date)) return;

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!groups[monthKey]) {
        groups[monthKey] = {
          count: 0,
          opens: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          sent: 0
        };
      }

      groups[monthKey].count++;
      groups[monthKey].opens += c.openRate;
      groups[monthKey].clicks += c.clickRate;
      groups[monthKey].conversions += c.conversions;
      groups[monthKey].revenue += c.revenue;
      groups[monthKey].sent += c.sent;
    });

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

  renderCharts() {
    this.renderTimelineChart();
    this.renderFunnelChart();
    this.renderTopCampaignsChart();
  }

  renderTimelineChart() {
    const ctx = document.getElementById('timeline-chart');
    if (!ctx) return;

    const filtered = this.getFilteredCampaigns();
    const monthGroups = {};

    filtered.forEach(campaign => {
      if (!campaign.date) return;
      const date = new Date(campaign.date);
      if (isNaN(date)) return;

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
          backgroundColor: ['rgba(99, 102, 241, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(236, 72, 153, 0.8)', 'rgba(16, 185, 129, 0.8)']
        }]
      },
      options: { ...this.getChartOptions(), indexAxis: 'y' }
    });
  }

  renderTopCampaignsChart() {
    const ctx = document.getElementById('top-campaigns-chart');
    if (!ctx) return;

    const filtered = this.getFilteredCampaigns();
    const emailCampaigns = filtered.filter(c => c.type === 'email');

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
        labels: sorted.map(c => c.name.substring(0, 30)),
        datasets: [{
          label: this.getMetricLabel(metric),
          data: sorted.map(c => c[metric]),
          backgroundColor: 'rgba(99, 102, 241, 0.8)'
        }]
      },
      options: this.getChartOptions()
    });
  }

  renderMonthlyChart() {
    const ctx = document.getElementById('monthly-chart');
    if (!ctx) return;

    const filtered = this.getFilteredCampaigns();
    const monthlyData = this.groupByMonth(filtered);
    const months = Object.keys(monthlyData).sort();
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
        labels: months.map(m => this.formatMonth(m)),
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

  getChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true }
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
        <td><span class="badge badge-success">Completa</span></td>
      </tr>
    `).join('');
  }

  exportChartAsImage(chartId) {
    const canvas = document.getElementById(chartId);
    if (!canvas || !canvas.chart) return;

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
    alert('Gráficos exportados!');
  }

  togglePresentationMode() {
    document.body.classList.toggle('presentation-mode');
  }

  exportCSV() {
    const filtered = this.getFilteredCampaigns();

    const headers = ['Campanha', 'CRM', 'Data', 'Enviados', 'Aberturas', 'Taxa Abertura', 'Cliques', 'CTR', 'Conversões'];
    const rows = filtered.map(c => [
      c.name,
      c.crm,
      c.date,
      c.sent,
      c.opens,
      c.openRate.toFixed(2) + '%',
      c.clicks,
      c.clickRate.toFixed(2) + '%',
      c.conversions
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

  calculateAverage(campaigns, field) {
    if (campaigns.length === 0) return 0;
    return campaigns.reduce((sum, c) => sum + (c[field] || 0), 0) / campaigns.length;
  }

  calculateSum(campaigns, field) {
    return campaigns.reduce((sum, c) => sum + (c[field] || 0), 0);
  }

  formatNumber(num) {
    return num.toLocaleString('pt-BR');
  }
}

// ============================================
// INITIALIZE APP
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new MarketingDashboard();
});
