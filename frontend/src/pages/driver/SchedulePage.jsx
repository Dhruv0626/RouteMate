import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ChevronLeft, Clock, Plus, Trash2, CheckCircle } from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const INITIAL_SCHEDULE = {
  Mon: [{ start: "08:00", end: "14:00" }],
  Tue: [{ start: "08:00", end: "14:00" }],
  Wed: [],
  Thu: [{ start: "16:00", end: "22:00" }],
  Fri: [{ start: "09:00", end: "18:00" }],
  Sat: [{ start: "07:00", end: "20:00" }],
  Sun: [],
};

const PEAK_HOURS = ["08:00–10:00", "12:00–14:00", "17:00–20:00"];

const SchedulePage = () => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState(INITIAL_SCHEDULE);
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [saved, setSaved] = useState(false);

  const totalHours = Object.values(schedule).flat().reduce((acc, slot) => {
    const [sh, sm] = slot.start.split(":").map(Number);
    const [eh, em] = slot.end.split(":").map(Number);
    return acc + (eh + em / 60) - (sh + sm / 60);
  }, 0);

  const addSlot = () => {
    setSchedule(prev => ({ ...prev, [selectedDay]: [...prev[selectedDay], { start: "09:00", end: "17:00" }] }));
  };

  const removeSlot = (day, idx) => {
    setSchedule(prev => ({ ...prev, [day]: prev[day].filter((_, i) => i !== idx) }));
  };

  const updateSlot = (day, idx, field, value) => {
    setSchedule(prev => {
      const updated = [...prev[day]];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, [day]: updated };
    });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mesh-bg relative min-h-screen pb-10 font-sans text-(--text-main)">
      <header className="sticky top-0 z-50 border-b border-(--card-border) bg-(--bg-main)/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/driver/dashboard")} className="rounded-xl p-2 text-(--text-dim) hover:bg-(--card-bg) hover:text-(--text-main) transition-all">
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-display text-lg font-black text-(--text-main)">My Schedule</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Active Days", value: `${Object.values(schedule).filter(s => s.length > 0).length}/7` },
            { label: "Total Hours", value: `${totalHours.toFixed(1)}h` },
            { label: "Avg/Day", value: `${(totalHours / 7).toFixed(1)}h` },
          ].map(({ label, value }) => (
            <div key={label} className="glass-card rounded-2xl p-4 text-center">
              <p className="text-[9px] font-black text-(--text-dim) uppercase tracking-widest">{label}</p>
              <p className="mt-1 text-2xl font-black text-(--text-main)">{value}</p>
            </div>
          ))}
        </div>

        {/* Day Selector */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {DAYS.map(day => {
            const hasSlots = schedule[day].length > 0;
            return (
              <button key={day} onClick={() => setSelectedDay(day)}
                className={`flex flex-shrink-0 flex-col items-center rounded-2xl px-4 py-3 transition-all duration-300 ${selectedDay === day ? "bg-primary text-black shadow-lg scale-105" : "glass-card text-(--text-dim) hover:text-(--text-main)"}`}>
                <span className="text-[10px] font-black tracking-widest uppercase">{day}</span>
                <div className={`mt-1 h-1.5 w-1.5 rounded-full ${hasSlots ? (selectedDay === day ? "bg-black" : "bg-primary") : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>

        {/* Time Slots */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-(--text-main)">{selectedDay}'s Shifts</h2>
            <button onClick={addSlot}
              className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2 text-xs font-black text-primary hover:bg-primary hover:text-black transition-all">
              <Plus size={14} /> Add Slot
            </button>
          </div>

          {schedule[selectedDay].length === 0 ? (
            <div className="rounded-2xl border border-dashed border-(--card-border) p-8 text-center">
              <Clock size={32} className="mx-auto mb-2 text-(--text-dim) opacity-40" />
              <p className="text-sm font-bold text-(--text-dim)">No shifts planned for {selectedDay}</p>
              <p className="text-xs text-(--text-dim) opacity-60 mt-1">Click "Add Slot" to plan your working hours</p>
            </div>
          ) : (
            schedule[selectedDay].map((slot, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-2xl border border-(--card-border) bg-(--card-bg) p-4">
                <Clock size={18} className="text-primary flex-shrink-0" />
                <div className="flex flex-1 items-center gap-3">
                  <input type="time" value={slot.start} onChange={e => updateSlot(selectedDay, idx, "start", e.target.value)}
                    className="rounded-xl border border-(--card-border) bg-(--bg-main) px-3 py-2 text-sm font-bold text-(--text-main) focus:border-primary focus:outline-none" />
                  <span className="text-sm font-black text-(--text-dim)">to</span>
                  <input type="time" value={slot.end} onChange={e => updateSlot(selectedDay, idx, "end", e.target.value)}
                    className="rounded-xl border border-(--card-border) bg-(--bg-main) px-3 py-2 text-sm font-bold text-(--text-main) focus:border-primary focus:outline-none" />
                </div>
                <button onClick={() => removeSlot(selectedDay, idx)}
                  className="rounded-xl p-2 text-red-400 hover:bg-red-500/10 transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Peak Hours Tips */}
        <div className="glass-card rounded-3xl p-6">
          <h2 className="font-display font-black text-(--text-main) mb-4">Peak Hours in Ahmedabad</h2>
          <div className="space-y-2">
            {PEAK_HOURS.map(h => (
              <div key={h} className="flex items-center gap-3 rounded-xl bg-amber-500/5 border border-amber-500/20 p-3">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm font-bold text-(--text-main)">{h}</span>
                <span className="ml-auto text-xs font-bold text-amber-500">High Demand 🔥</span>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button onClick={handleSave}
          className={`w-full rounded-2xl py-4 text-sm font-black tracking-widest uppercase transition-all duration-300 ${saved ? "bg-emerald-500 text-white" : "bg-primary text-black hover:opacity-90"}`}>
          {saved ? <span className="flex items-center justify-center gap-2"><CheckCircle size={16} /> Schedule Saved!</span> : "Save Schedule"}
        </button>
      </main>
    </div>
  );
};

export default SchedulePage;
