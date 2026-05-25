function loadEvents() {
  return JSON.parse(localStorage.getItem('yotei_events') || '[]');
}

function saveEvents(events) {
  localStorage.setItem('yotei_events', JSON.stringify(events));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let currentTab = 'upcoming';

function addEvent() {
  const date = document.getElementById('input-date').value;
  const time = document.getElementById('input-time').value;
  const title = document.getElementById('input-title').value.trim();
  const place = document.getElementById('input-place').value.trim();
  const memo = document.getElementById('input-memo').value.trim();

  if (!date) { alert('日付を入力してください'); return; }
  if (!time) { alert('時刻を入力してください'); return; }
  if (!title) { alert('タイトルを入力してください'); return; }

  const events = loadEvents();
  events.push({
    id: Date.now().toString(),
    date,
    time,
    title,
    place,
    memo
  });
  saveEvents(events);

  document.getElementById('input-title').value = '';
  document.getElementById('input-place').value = '';
  document.getElementById('input-memo').value = '';

  renderEvents();
}

function deleteEvent(id) {
  if (!confirm('この予定を削除しますか？')) return;
  const events = loadEvents().filter(e => e.id !== id);
  saveEvents(events);
  renderEvents();
}

function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tab-upcoming').classList.toggle('active', tab === 'upcoming');
  document.getElementById('tab-past').classList.toggle('active', tab === 'past');
  renderEvents();
}

function renderEvents() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const nowTimeStr = now.toTimeString().slice(0, 5);

  const events = loadEvents();

  const filtered = events.filter(e => {
    const isPast = e.date < todayStr || (e.date === todayStr && e.time < nowTimeStr);
    return currentTab === 'past' ? isPast : !isPast;
  });

  filtered.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  const list = document.getElementById('event-list');
  const noEvents = document.getElementById('no-events');
  list.innerHTML = '';

  if (filtered.length === 0) {
    noEvents.style.display = 'block';
    return;
  }

  noEvents.style.display = 'none';

  let lastDate = null;

  filtered.forEach(e => {
    const [y, m, d] = e.date.split('-');
    const dateLabel = `${parseInt(m)}月${parseInt(d)}日`;

    if (e.date !== lastDate) {
      const separator = document.createElement('li');
      separator.className = 'date-separator';
      separator.textContent = dateLabel;
      list.appendChild(separator);
      lastDate = e.date;
    }

    const isToday = e.date === todayStr;

    const li = document.createElement('li');
    li.className = 'event-item' + (isToday ? ' today' : '');
    li.innerHTML = `
      <div class="event-main">
        ${currentTab === 'upcoming'
          ? `<span class="event-date editable" onclick="startEdit('${e.id}', 'date', this)">${parseInt(m)}/${parseInt(d)}</span>
             <span class="event-time editable" onclick="startEdit('${e.id}', 'time', this)">${e.time}</span>
             <span class="event-title editable" onclick="startEdit('${e.id}', 'title', this)">${escapeHtml(e.title)}</span>`
          : `<span class="event-time">${e.time}</span>
             <span class="event-title">${escapeHtml(e.title)}</span>`
        }
        ${currentTab === 'upcoming'
          ? `<span class="event-place editable" onclick="startEdit('${e.id}', 'place', this)">${e.place ? '📍 ' + escapeHtml(e.place) : '<span class="memo-placeholder">場所を追加...</span>'}</span>`
          : e.place ? `<span class="event-place">📍 ${escapeHtml(e.place)}</span>` : ''
        }
        ${currentTab === 'upcoming'
          ? `<span class="event-memo editable" onclick="startEdit('${e.id}', 'memo', this)">${e.memo ? escapeHtml(e.memo) : '<span class="memo-placeholder">メモを追加...</span>'}</span>`
          : e.memo ? `<span class="event-memo">${escapeHtml(e.memo)}</span>` : ''
        }
      </div>
      <button class="btn-delete" onclick="deleteEvent('${e.id}')">削除</button>
    `;
    list.appendChild(li);
  });
}

function startEdit(id, field, el) {
  const events = loadEvents();
  const event = events.find(e => e.id === id);
  if (!event) return;

  const input = document.createElement('input');
  input.type = field === 'time' ? 'time' : field === 'date' ? 'date' : 'text';
  input.value = event[field] || '';
  input.className = field === 'time' ? 'time-input' : field === 'date' ? 'date-input' : field === 'title' ? 'title-input' : 'memo-input';
  if (field === 'memo') input.placeholder = 'メモを入力...';

  el.replaceWith(input);
  input.focus();

  let saved = false;

  function save() {
    if (saved) return;
    saved = true;
    const val = input.value.trim();
    if (field !== 'memo' && field !== 'place' && !val) { renderEvents(); return; }
    const events = loadEvents();
    const ev = events.find(e => e.id === id);
    if (ev) {
      ev[field] = val;
      saveEvents(events);
    }
    renderEvents();
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') { saved = true; renderEvents(); }
  });
  input.addEventListener('blur', save);
}

// 初期化
document.getElementById('input-date').value = new Date().toISOString().slice(0, 10);
renderEvents();
