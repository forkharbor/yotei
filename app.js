const LOCAL_STORAGE_KEY = 'yotei_events';
const firebaseConfig = {
  apiKey: 'AIzaSyCfvqQWLB8NJqmaH0k2G0wPcbJJjz2Vu4A',
  authDomain: 'kaimemo-58bad.firebaseapp.com',
  projectId: 'kaimemo-58bad',
  storageBucket: 'kaimemo-58bad.firebasestorage.app',
  messagingSenderId: '308069117698',
  appId: '1:308069117698:web:c61a57853abb7e8ffb1c1b'
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const sharedEventsRef = db.collection('data').doc('yotei');

function loadCachedEvents() {
  try {
    const events = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    return Array.isArray(events) ? events : [];
  } catch (error) {
    return [];
  }
}

let eventsCache = loadCachedEvents();
let syncReady = false;

function setSyncStatus(text, state = '') {
  const status = document.getElementById('sync-status');
  status.textContent = text;
  status.className = `sync-status ${state}`.trim();
}

function cacheEvents(events) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events));
}

function loadEvents() {
  return eventsCache;
}

function setSyncReady() {
  syncReady = true;
  document.getElementById('btn-add-event').disabled = false;
}

function requireSyncReady() {
  if (syncReady) return true;
  alert('データの同期が完了するまでお待ちください');
  return false;
}

async function saveEvents(events) {
  eventsCache = events;
  cacheEvents(events);
  setSyncStatus('データを保存しています...');
  try {
    await sharedEventsRef.set({ events });
    setSyncStatus('共有データに同期済み', 'ok');
  } catch (error) {
    setSyncStatus('同期に失敗しました', 'error');
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pad(number) {
  return String(number).padStart(2, '0');
}

function formatDateValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const todayValue = formatDateValue(new Date());
let selectedDate = todayValue;
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();

function createEventId() {
  return window.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function addEvent() {
  if (!requireSyncReady()) return;

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
    id: createEventId(),
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

  selectDate(date);
}

function deleteEvent(id) {
  if (!requireSyncReady()) return;
  if (!confirm('この予定を削除しますか？')) return;
  const events = loadEvents().filter(e => e.id !== id);
  saveEvents(events);
  renderEvents();
}

function goToday() {
  selectedDate = todayValue;
  calendarYear = new Date().getFullYear();
  calendarMonth = new Date().getMonth();
  document.getElementById('input-date').value = selectedDate;
  renderEvents();
}

function shiftMonth(offset) {
  calendarMonth += offset;
  if (calendarMonth < 0) {
    calendarMonth = 11;
    calendarYear--;
  }
  if (calendarMonth > 11) {
    calendarMonth = 0;
    calendarYear++;
  }
  selectedDate = `${calendarYear}-${pad(calendarMonth + 1)}-01`;
  document.getElementById('input-date').value = selectedDate;
  renderEvents();
}

function selectDate(dateValue) {
  selectedDate = dateValue;
  const [year, month] = dateValue.split('-').map(Number);
  calendarYear = year;
  calendarMonth = month - 1;
  document.getElementById('input-date').value = dateValue;
  renderEvents();
}

function renderCalendar(events) {
  const calendar = document.getElementById('calendar-grid');
  document.getElementById('calendar-month').textContent = `${calendarYear}年 ${calendarMonth + 1}月`;
  calendar.innerHTML = '';

  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  for (let index = 0; index < firstDay; index++) {
    const blank = document.createElement('span');
    blank.className = 'calendar-day blank';
    calendar.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateValue = `${calendarYear}-${pad(calendarMonth + 1)}-${pad(day)}`;
    const dayEvents = events
      .filter(event => event.date === dateValue)
      .sort((a, b) => a.time.localeCompare(b.time));
    const dayOfWeek = new Date(calendarYear, calendarMonth, day).getDay();
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'calendar-day'
      + (dateValue === todayValue ? ' today' : '')
      + (dateValue === selectedDate ? ' selected' : '')
      + (dayOfWeek === 0 ? ' sun' : '')
      + (dayOfWeek === 6 ? ' sat' : '');
    cell.onclick = () => selectDate(dateValue);

    const number = document.createElement('span');
    number.className = 'calendar-day-number';
    number.textContent = day;
    cell.appendChild(number);

    dayEvents.slice(0, 2).forEach(event => {
      const badge = document.createElement('span');
      badge.className = 'calendar-event';
      badge.textContent = `${event.time} ${event.title}`;
      cell.appendChild(badge);
    });

    if (dayEvents.length > 2) {
      const more = document.createElement('span');
      more.className = 'calendar-more';
      more.textContent = `+${dayEvents.length - 2}`;
      cell.appendChild(more);
    }

    calendar.appendChild(cell);
  }
}

function renderEvents() {
  const events = loadEvents();
  renderCalendar(events);

  const selectedEvents = events
    .filter(event => event.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));
  const list = document.getElementById('event-list');
  const noEvents = document.getElementById('no-events');
  const [year, month, day] = selectedDate.split('-').map(Number);
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][new Date(year, month - 1, day).getDay()];
  document.getElementById('selected-day-title').textContent = `${month}月${day}日（${weekday}）の予定`;
  list.innerHTML = '';

  if (selectedEvents.length === 0) {
    noEvents.style.display = 'block';
    return;
  }

  noEvents.style.display = 'none';

  selectedEvents.forEach(e => {
    const li = document.createElement('li');
    li.className = 'event-item' + (e.date === todayValue ? ' today' : '');
    li.innerHTML = `
      <div class="event-main">
        <span class="event-date editable" onclick="startEdit('${e.id}', 'date', this)">${month}/${day}</span>
        <span class="event-time editable" onclick="startEdit('${e.id}', 'time', this)">${e.time}</span>
        <span class="event-title editable" onclick="startEdit('${e.id}', 'title', this)">${escapeHtml(e.title)}</span>
        <span class="event-place editable" onclick="startEdit('${e.id}', 'place', this)">${e.place ? escapeHtml(e.place) : '<span class="memo-placeholder">場所を追加...</span>'}</span>
        <span class="event-memo editable" onclick="startEdit('${e.id}', 'memo', this)">${e.memo ? escapeHtml(e.memo) : '<span class="memo-placeholder">メモを追加...</span>'}</span>
      </div>
      <button class="btn-delete" onclick="deleteEvent('${e.id}')">削除</button>
    `;
    list.appendChild(li);
  });
}

function startEdit(id, field, el) {
  if (!requireSyncReady()) return;

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
    if (field === 'date') {
      selectDate(val);
    } else {
      renderEvents();
    }
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') { saved = true; renderEvents(); }
  });
  input.addEventListener('blur', save);
}

sharedEventsRef.onSnapshot(async snapshot => {
  if (!syncReady && !snapshot.exists && eventsCache.length > 0) {
    setSyncReady();
    setSyncStatus('端末内の予定を共有しています...');
    try {
      await sharedEventsRef.set({ events: eventsCache });
    } catch (error) {
      setSyncStatus('同期に失敗しました', 'error');
    }
    renderEvents();
    return;
  }

  setSyncReady();
  eventsCache = snapshot.exists && Array.isArray(snapshot.data().events)
    ? snapshot.data().events
    : [];
  cacheEvents(eventsCache);
  setSyncStatus('共有データに同期済み', 'ok');
  renderEvents();
}, () => {
  setSyncStatus('同期に失敗しました', 'error');
});

// 初期化
document.getElementById('input-date').value = todayValue;
renderEvents();
