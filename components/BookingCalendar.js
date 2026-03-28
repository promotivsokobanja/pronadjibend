'use client';
import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';
import { cellCalendarKey, dateToCalendarKeyUTC } from '../lib/calendarDate';

/** Maks. dana u jednom upitu (isti limit kao na API-ju) */
const MAX_CLIENT_SELECTABLE_DATES = 14;

function normalizeBusyKey(d) {
  if (d == null || d === '') return '';
  if (typeof d === 'string') {
    const s = d.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return dateToCalendarKeyUTC(d);
  }
  if (d && d.date) return dateToCalendarKeyUTC(d.date);
  if (d instanceof Date) return dateToCalendarKeyUTC(d);
  return '';
}

/**
 * Kada je prosleđeno (bend panel): svi `busyDates` su vizuelno zauzeti, ali se klik na zauzeti
 * datum dozvoljava samo ako je u `manualBusyDateKeys` (ručni BusyDate) — da bi se mogao skloniti.
 * Javna strana za rezervaciju: ne prosleđuj `manualBusyDateKeys` — zauzeti datumi nisu klikabilni.
 */
export default function BookingCalendar({
  bandId,
  onDateSelect,
  selectedDate,
  /** Više dana (javna rezervacija): niz YYYY-MM-DD */
  multiSelect = false,
  selectedDates,
  onDatesChange,
  busyDates = [],
  manualBusyDateKeys,
  /** YYYY-MM-DD → tekst napomene (samo bend panel) */
  busyReasonByKey = {},
  basePrice = 500,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [days, setDays] = useState([]);

  const generateDays = useCallback(() => {
    const bandMode = manualBusyDateKeys !== undefined;
    const normalizedManual = bandMode
      ? (Array.isArray(manualBusyDateKeys) ? manualBusyDateKeys : []).map((k) => normalizeBusyKey(k))
      : [];

    const normalizedBusy = (Array.isArray(busyDates) ? busyDates : [])
      .map((d) => normalizeBusyKey(d))
      .filter(Boolean);

    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    let startDay = startOfMonth.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    const totalDays = endOfMonth.getDate();
    const daysArr = [];

    for (let i = 0; i < startDay; i++) {
      daysArr.push({ day: null });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const y = currentMonth.getFullYear();
    const mo = currentMonth.getMonth();

    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(y, mo, i);
      const dateStr = cellCalendarKey(y, mo, i);
      const isBusy = normalizedBusy.includes(dateStr);
      const isPast = date < todayStart;
      const isManualBusy = bandMode && isBusy && normalizedManual.includes(dateStr);
      const isLockedBusy = bandMode && isBusy && !isManualBusy;

      const isSelected = multiSelect
        ? Array.isArray(selectedDates) && selectedDates.includes(dateStr)
        : selectedDate === dateStr;

      daysArr.push({
        day: i,
        date: dateStr,
        isBusy,
        isPast,
        isManualBusy,
        isLockedBusy,
        isSelected,
      });
    }

    setDays(daysArr);
  }, [currentMonth, busyDates, selectedDate, selectedDates, multiSelect, manualBusyDateKeys]);

  useEffect(() => {
    generateDays();
  }, [generateDays]);

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const handleSelect = (dayObj) => {
    if (!dayObj.day || dayObj.isPast) return;
    if (dayObj.isLockedBusy) return;
    /* Zauzeti dani (bend ih je označio ili postoji potvrđena rezervacija) — nisu klikabilni */
    if (dayObj.isBusy && manualBusyDateKeys === undefined) return;

    if (multiSelect && onDatesChange) {
      const cur = Array.isArray(selectedDates) ? selectedDates : [];
      const key = dayObj.date;
      if (cur.includes(key)) {
        onDatesChange(cur.filter((k) => k !== key));
        return;
      }
      if (cur.length >= MAX_CLIENT_SELECTABLE_DATES) return;
      onDatesChange([...cur, key].sort());
      return;
    }

    if (manualBusyDateKeys === undefined && dayObj.isSelected) {
      onDateSelect?.(null);
      return;
    }
    onDateSelect?.(dayObj.date);
  };

  const monthsSR = [
    'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 
    'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
  ];

  return (
    <div className={`calendar-card${manualBusyDateKeys !== undefined ? ' band-toggle-mode' : ''}`}>
      <div className="calendar-header">
        <h3>{monthsSR[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
        <div className="calendar-nav">
          <button onClick={prevMonth} className="nav-btn"><ChevronLeft size={18} /></button>
          <button onClick={nextMonth} className="nav-btn"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="calendar-grid">
        {['Po', 'Ut', 'Sr', 'Če', 'Pe', 'Su', 'Ne'].map(d => (
          <div key={d} className="week-day">{d}</div>
        ))}
        {days.map((d, i) => (
          <div 
            key={i} 
            className={`calendar-day 
                ${!d.day ? 'empty' : ''} 
                ${d.isBusy ? 'busy' : ''} 
                ${d.isLockedBusy ? 'busy-locked' : ''} 
                ${d.isPast ? 'past' : ''} 
                ${d.isSelected ? 'selected' : ''}`}
            title={
              d.day && d.isBusy && manualBusyDateKeys === undefined
                ? 'Zauzeto — nije moguće rezervisati'
                : d.day && manualBusyDateKeys !== undefined && d.isManualBusy
                  ? busyReasonByKey[d.date]?.trim()
                    ? `Podsetnik: ${busyReasonByKey[d.date].trim()}`
                    : 'Ručno zauzeto — klik za podsetnik / uklanjanje'
                  : d.day && manualBusyDateKeys === undefined && d.isSelected
                    ? multiSelect
                      ? 'Kliknite da uklonite ovaj dan iz izbora'
                      : 'Kliknite ponovo da uklonite izbor datuma'
                    : undefined
            }
            onClick={() => handleSelect(d)}
          >
            {d.day}
          </div>
        ))}
      </div>

      {(() => {
        const n = multiSelect
          ? Array.isArray(selectedDates)
            ? selectedDates.length
            : 0
          : selectedDate
            ? 1
            : 0;
        if (n === 0) return null;
        const line = (label, totalEur) => (
          <div className="summary-row" key={label}>
            <span>
              {label}
              {n > 1 ? ` × ${n}` : ''}
            </span>
            <span>{totalEur}€</span>
          </div>
        );
        return (
          <div className="booking-summary">
            {line('Osnovna cena', basePrice * n)}
            {line('Rezervacija (Instant)', 50 * n)}
            <div className="summary-total">
              <span>Ukupno ({n} {n === 1 ? 'dan' : 'dana'})</span>
              <span>{(basePrice + 50) * n}€</span>
            </div>
            <p className="summary-note"><Info size={12}/> Cena može varirati zavisno od lokacije.</p>
          </div>
        );
      })()}

      <style jsx>{`
        .calendar-card { 
          background: #ffffff; 
          border-radius: 20px; 
          padding: 1.5rem;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
          border: 1px solid #f1f5f9;
          max-width: 350px;
        }
        
        .calendar-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 1.5rem; 
        }
        
        .calendar-header h3 { 
          font-weight: 700; 
          font-size: 1rem; 
          color: #1e293b;
          margin: 0;
        }
        
        .calendar-nav { display: flex; gap: 0.5rem; }
        .nav-btn { 
          background: #f8fafc; 
          border: none; 
          color: #64748b; 
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%; 
          cursor: pointer; 
          transition: 0.2s; 
        }
        .nav-btn:hover { background: #f1f5f9; color: #0f172a; }

        .calendar-grid { 
          display: grid; 
          grid-template-columns: repeat(7, 1fr); 
          gap: 2px;
          text-align: center; 
        }
        
        .week-day { 
          font-size: 0.75rem; 
          font-weight: 600; 
          color: #94a3b8; 
          padding-bottom: 12px;
        }
        
        .calendar-day { 
          aspect-ratio: 1; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 0.9rem; 
          font-weight: 500; 
          cursor: pointer; 
          border-radius: 12px;
          transition: 0.2s; 
          color: #334155;
        }
        
        .calendar-day:hover:not(.empty):not(.past):not(.busy) { 
          background: #f1f5f9; 
        }
        .band-toggle-mode .calendar-day.busy:not(.busy-locked):hover:not(.empty):not(.past) {
          background: #eef2ff;
        }
        
        .past { color: #cbd5e1; cursor: not-allowed; }
        .calendar-day.busy {
          background: linear-gradient(160deg, #e2e8f0 0%, #cbd5e1 100%);
          color: #475569;
          font-weight: 800;
          border: 1px solid #94a3b8;
          text-decoration: line-through;
          text-decoration-thickness: 2px;
          text-decoration-color: #64748b;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }
        .band-toggle-mode .calendar-day.busy:not(.busy-locked) {
          cursor: pointer;
          background: linear-gradient(160deg, #e0e7ff 0%, #c7d2fe 100%);
          color: #312e81;
          border-color: #818cf8;
          text-decoration-color: #4f46e5;
        }
        .busy-locked {
          cursor: not-allowed !important;
          background: linear-gradient(160deg, #f1f5f9 0%, #e2e8f0 100%) !important;
          color: #64748b !important;
          border-color: #cbd5e1 !important;
          text-decoration-color: #94a3b8 !important;
        }
        
        .selected { 
          background: #8b5cf6 !important; 
          color: white !important; 
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }
        .calendar-card:not(.band-toggle-mode) .calendar-day.selected {
          cursor: pointer;
        }
        .calendar-card:not(.band-toggle-mode) .calendar-day.selected:hover {
          filter: brightness(1.08);
        }

        .booking-summary {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #f1f5f9;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          color: #64748b;
          margin-bottom: 0.5rem;
        }

        .summary-total {
          display: flex;
          justify-content: space-between;
          font-weight: 700;
          color: #0f172a;
          font-size: 1rem;
          margin-top: 1rem;
          margin-bottom: 0.75rem;
        }

        .summary-note {
          font-size: 0.75rem;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 4px;
        }
      `}</style>
    </div>
  );
}
