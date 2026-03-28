'use client';
import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';

export default function BookingCalendar({ bandId, onDateSelect, selectedDate, busyDates = [], basePrice = 500 }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [days, setDays] = useState([]);

  const generateDays = useCallback(() => {
    const normalizedBusy = (Array.isArray(busyDates) ? busyDates : []).map((d) => {
      if (typeof d === 'string') return d.split('T')[0];
      if (d.date) return new Date(d.date).toISOString().split('T')[0];
      return d.toISOString().split('T')[0];
    });

    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    let startDay = startOfMonth.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    const totalDays = endOfMonth.getDate();
    const daysArr = [];

    for (let i = 0; i < startDay; i++) {
      daysArr.push({ day: null });
    }

    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      const dateStr = date.toISOString().split('T')[0];
      const isBusy = normalizedBusy.includes(dateStr);
      const isPast = date < new Date().setHours(0, 0, 0, 0);

      daysArr.push({
        day: i,
        date: dateStr,
        isBusy,
        isPast,
        isSelected: selectedDate === dateStr,
      });
    }

    setDays(daysArr);
  }, [currentMonth, busyDates, selectedDate]);

  useEffect(() => {
    generateDays();
  }, [generateDays]);

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const handleSelect = (dayObj) => {
    if (dayObj.isBusy || dayObj.isPast || !dayObj.day) return;
    onDateSelect(dayObj.date);
  };

  const monthsSR = [
    'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 
    'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
  ];

  return (
    <div className="calendar-card">
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
                ${d.isPast ? 'past' : ''} 
                ${d.isSelected ? 'selected' : ''}`}
            onClick={() => handleSelect(d)}
          >
            {d.day}
          </div>
        ))}
      </div>

      {selectedDate && (
        <div className="booking-summary">
          <div className="summary-row">
            <span>Osnovna cena</span>
            <span>{basePrice}€</span>
          </div>
          <div className="summary-row">
            <span>Rezervacija (Instant)</span>
            <span>50€</span>
          </div>
          <div className="summary-total">
            <span>Ukupno</span>
            <span>{basePrice + 50}€</span>
          </div>
          <p className="summary-note"><Info size={12}/> Cena može varirati zavisno od lokacije.</p>
        </div>
      )}

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
        
        .past { color: #cbd5e1; cursor: not-allowed; }
        .busy { 
          text-decoration: line-through; 
          color: #cbd5e1; 
          cursor: not-allowed; 
        }
        
        .selected { 
          background: #8b5cf6 !important; 
          color: white !important; 
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
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
