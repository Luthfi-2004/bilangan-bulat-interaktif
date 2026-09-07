export class NumberLine {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.min = options.min || -10;
    this.max = options.max || 10;
    this.currentValue = options.initial || 0;
    this.onChange = options.onChange || null;
    
    this.render();
  }
  
  render() {
    let html = \`
      <div style="overflow-x: auto; padding: 20px 0; touch-action: pan-y;">
        <div style="position: relative; width: max-content; min-width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 30px 20px;">
          
          <!-- Garis Hitam Utama -->
          <div style="position: absolute; top: 50%; left: 0; right: 0; height: 4px; background: #333; z-index: 1;"></div>
          
          <!-- Panah Kiri Kanan -->
          <div style="position: absolute; top: 50%; left: 0; width: 10px; height: 10px; border-left: 4px solid #333; border-bottom: 4px solid #333; transform: translateY(-50%) rotate(45deg); z-index: 2;"></div>
          <div style="position: absolute; top: 50%; right: 0; width: 10px; height: 10px; border-right: 4px solid #333; border-top: 4px solid #333; transform: translateY(-50%) rotate(45deg); z-index: 2;"></div>
    \`;
    
    for (let i = this.min; i <= this.max; i++) {
      const isCurrent = i === this.currentValue;
      const isZero = i === 0;
      let colorClass = isZero ? '#000' : (i < 0 ? 'var(--danger)' : 'var(--primary)');
      
      html += \`
        <div style="position: relative; z-index: 3; display: flex; flex-direction: column; align-items: center; width: 40px; cursor: pointer;"
             class="number-point" data-value="\${i}">
          
          <!-- Tick marker -->
          <div style="width: 4px; height: \${isZero ? '20px' : '12px'}; background: #333; margin-bottom: 5px;"></div>
          
          <!-- Number Label -->
          <div style="
            font-weight: \${isCurrent ? '800' : '500'}; 
            color: \${isCurrent ? 'white' : colorClass};
            background: \${isCurrent ? 'var(--primary)' : 'transparent'};
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            box-shadow: \${isCurrent ? '0 2px 5px rgba(0,0,0,0.2)' : 'none'};
          ">\${i}</div>
        </div>
      \`;
    }
    
    html += \`
        </div>
      </div>
    \`;
    
    this.container.innerHTML = html;
    this.attachEvents();
  }
  
  attachEvents() {
    const points = this.container.querySelectorAll('.number-point');
    points.forEach(point => {
      point.addEventListener('click', (e) => {
        const val = parseInt(e.currentTarget.getAttribute('data-value'));
        this.setValue(val);
      });
    });
  }
  
  setValue(val) {
    if (val >= this.min && val <= this.max) {
      this.currentValue = val;
      this.render();
      if (this.onChange) {
        this.onChange(val);
      }
    }
  }
  
  getValue() {
    return this.currentValue;
  }
}
