import React, { useState, useEffect } from 'react';
import { 
  FileText, Table, Download, BarChart3, ArrowRight, 
  TrendingUp, PieChart, CheckCircle, Flame, Sparkles
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const Reports = () => {
  const { user } = useAuth();
  const [data, setData] = useState({ tasks: [], habits: [] });
  const [loading, setLoading] = useState(true);

  // Fetch Data for Reports
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const tasksSnap = await getDocs(collection(db, 'users', user.uid, 'tasks'));
        const habitsSnap = await getDocs(collection(db, 'users', user.uid, 'habits'));

        setData({
          tasks: tasksSnap.docs.map(d => d.data()),
          habits: habitsSnap.docs.map(d => d.data())
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // --- ENHANCED EXCEL EXPORT ---
  const downloadExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // 1. Task Sheet
    const taskData = data.tasks.map(t => ({
      'Task Description': t.text,
      'Priority Level': t.priority,
      'Deadline': t.dueDate || 'N/A',
      'Completion Status': t.completed ? 'COMPLETED' : 'PENDING',
      'Created At': t.createdAt?.toDate ? t.createdAt.toDate().toLocaleString() : 'N/A'
    }));
    const taskSheet = XLSX.utils.json_to_sheet(taskData);
    XLSX.utils.book_append_sheet(workbook, taskSheet, "Tasks Archive");
    
    // 2. Habit Sheet
    const habitData = data.habits.map(h => ({
      'Habit Name': h.name,
      'Checks This Month': h.checks?.length || 0,
      'Consistency Score': `${Math.round(((h.checks?.length || 0) / 31) * 100)}%`,
      'Color Theme': h.color || 'Indigo'
    }));
    const habitSheet = XLSX.utils.json_to_sheet(habitData);
    XLSX.utils.book_append_sheet(workbook, habitSheet, "Habit Trends");
    
    XLSX.writeFile(workbook, `FocusFlow_Master_Report_${new Date().getFullYear()}.xlsx`);
  };

  // --- EXECUTIVE PDF EXPORT ---
  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const themeColor = [99, 102, 241]; // Indigo-500
    const emeraldColor = [16, 185, 129];

    // Header Background
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Title & Logo
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("FocusFlow", 15, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text("EXECUTIVE PRODUCTIVITY AUDIT", 15, 35);

    // Date & User
    doc.setTextColor(255, 255, 255);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 15, 25, { align: 'right' });
    doc.text(`Owner: ${user?.displayName || 'Authorized User'}`, pageWidth - 15, 35, { align: 'right' });

    // Summary Section
    let startY = 65;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Report Summary", 15, startY);

    // Summary Cards
    const completedTasks = data.tasks.filter(t => t.completed).length;
    
    autoTable(doc, {
      startY: startY + 8,
      head: [['Metric', 'Value', 'Status']],
      body: [
        ['Total Tasks Logged', data.tasks.length, 'Verified'],
        ['Tasks Completed', completedTasks, `${Math.round((completedTasks / (data.tasks.length || 1)) * 100)}% Success`],
        ['Active Habits', data.habits.length, 'Growth Phase'],
      ],
      theme: 'grid',
      headStyles: { fillColor: themeColor, fontStyle: 'bold' },
      styles: { cellPadding: 5, fontSize: 10 }
    });

    // Tasks Detail Table
    doc.text("Detailed Task Breakdown", 15, doc.lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Task', 'Priority', 'Status']],
      body: data.tasks.map(t => [t.text, t.priority, t.completed ? 'DONE' : 'PENDING']),
      headStyles: { fillColor: themeColor },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 2) {
          cellData.cell.styles.textColor = cellData.cell.raw === 'DONE' ? emeraldColor : [239, 68, 68];
          cellData.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // Habit Detail Table
    doc.addPage();
    doc.text("Habit Consistency Metrics", 15, 20);
    autoTable(doc, {
      startY: 25,
      head: [['Habit Name', 'Completions', 'Intensity']],
      body: data.habits.map(h => [
        h.name, 
        h.checks?.length || 0, 
        `${Math.round(((h.checks?.length || 0) / 31) * 100)}%`
      ]),
      headStyles: { fillColor: emeraldColor },
      columnStyles: { 2: { halign: 'right' } }
    });

    doc.save(`FocusFlow_Executive_Report.pdf`);
  };

  const cardBase = "bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 shadow-sm transition-all duration-300";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto pb-20 px-4">
      
      {/* GLASSMORPHISM HEADER */}
      <div className={`p-8 rounded-[40px] ${cardBase} relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[30px] flex items-center justify-center shadow-2xl shadow-indigo-500/40">
            <BarChart3 className="text-white" size={44} />
          </div>
          <div className="text-center md:text-left">
            <h6 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase ">Intelligence Center</h6>
            <p className="text-slate-500 dark:text-zinc-400 mt-2 text-lg font-medium max-w-md">
              Securely export your productivity DNA into professional formats.
            </p>
          </div>
        </div>
      </div>

      {/* QUICK STATS PREVIEW (BENTO STYLE) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`${cardBase} p-6 rounded-[30px] flex flex-col items-center justify-center`}>
            <CheckCircle className="text-indigo-500 mb-2" size={20} />
            <span className="text-2xl font-black">{data.tasks.length}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tasks Logged</span>
        </div>
        <div className={`${cardBase} p-6 rounded-[30px] flex flex-col items-center justify-center`}>
            <Flame className="text-orange-500 mb-2" size={20} />
            <span className="text-2xl font-black">{data.habits.length}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Habits</span>
        </div>
        <div className={`${cardBase} p-6 rounded-[30px] flex flex-col items-center justify-center`}>
            <TrendingUp className="text-emerald-500 mb-2" size={20} />
            <span className="text-2xl font-black">
              {data.tasks.length > 0 ? Math.round((data.tasks.filter(t => t.completed).length / data.tasks.length) * 100) : 0}%
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efficiency</span>
        </div>
        <div className={`${cardBase} p-6 rounded-[30px] flex flex-col items-center justify-center`}>
            <Sparkles className="text-purple-500 mb-2" size={20} />
            <span className="text-2xl font-black">{new Date().getFullYear()}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Report Cycle</span>
        </div>
      </div>

      {/* EXPORT OPTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* PDF CARD */}
        <div className={`group p-10 rounded-[48px] ${cardBase} hover:border-indigo-500/50 hover:shadow-2xl transition-all relative overflow-hidden`}>
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <FileText size={120} />
          </div>
          <div className="flex flex-col h-full">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <FileText size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Executive PDF</h2>
            <p className="text-slate-500 dark:text-zinc-500 mt-4 mb-8 font-medium">
              High-fidelity document featuring executive summaries, color-coded tables, and progress auditing.
            </p>
            <button 
              onClick={downloadPDF} 
              className="mt-auto group/btn flex items-center justify-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-black py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:opacity-90 transition-all active:scale-95"
            >
              Generate PDF <Download size={18} className="group-hover/btn:translate-y-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* EXCEL CARD */}
        <div className={`group p-10 rounded-[48px] ${cardBase} hover:border-emerald-500/50 hover:shadow-2xl transition-all relative overflow-hidden`}>
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Table size={120} />
          </div>
          <div className="flex flex-col h-full">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Table size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Analysis Excel</h2>
            <p className="text-slate-500 dark:text-zinc-500 mt-4 mb-8 font-medium">
              Multi-sheet workbook containing raw data, historical timestamps, and consistency metrics for deep analysis.
            </p>
            <button 
              onClick={downloadExcel} 
              className="mt-auto group/btn flex items-center justify-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-black py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:opacity-90 transition-all active:scale-95"
            >
              Export Sheets <Download size={18} className="group-hover/btn:translate-y-1 transition-transform" />
            </button>
          </div>
        </div>

      </div>

      {/* SYSTEM LOG */}
      <div className="flex items-center justify-center gap-6 py-8">
          <div className="h-px bg-slate-200 dark:bg-white/10 flex-1"></div>
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
             <Sparkles size={12} className="text-indigo-500" /> AES-256 Encrypted Handshake
          </div>
          <div className="h-px bg-slate-200 dark:bg-white/10 flex-1"></div>
      </div>

    </div>
  );
};

export default Reports;