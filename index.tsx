
// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { auth, db } from './src/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import Markdown from 'react-markdown';
import jsPDF from 'jspdf';
import { GoogleGenAI, Type } from "@google/genai";
import { 
    Info, 
    Star, 
    FileText, 
    Archive, 
    BookOpen, 
    Home, 
    LayoutDashboard, 
    Users, 
    GraduationCap, 
    ChevronRight,
    CheckCircle2,
    BarChart3,
    ShieldCheck,
    Zap,
    ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_LOGO = "https://drive.google.com/uc?export=view&id=1Bp2fcq7QY56XBmv3yTx4W8ogvjfFcKTt";

const C_DATA = {
    "Organisation": { 
        weight: 0.10, 
        criteria: {
            "Struktur & Organigramm": "Definition von Verantwortlichkeiten und Hierarchien. Regelt die vertikale und horizontale Struktur der Institution.",
            "Leitbild & Vision": "Aktualität und Bekanntheitsgrad des Leitbilds. Ein Dokument, das die Ziele, Werte und den Weg eines Museums festlegt.",
            "Rechtsform & Trägerschaft": "Zukunftsfähigkeit der Trägerschaft. Bewertet die rechtliche Stabilität und Handlungsfähigkeit.",
            "Interne Kommunikation": "Effizienz des Informationsflusses zwischen Abteilungen und Hierarchieebenen."
        }
    },
    "Finanzierung": { 
        weight: 0.15, 
        criteria: {
            "Budgetplanung & -kontrolle": "Präzision der Wirtschaftsführung und regelmäßiges Reporting an Gremien.",
            "Anteil Eigenmittel": "Verhältnis von Erträgen (Eintritt, Shop) zu öffentlichen Zuschüssen.",
            "Drittmittel & Sponsoring": "Erfolg bei der Akquise von Fördermitteln, Stiftungen und Sponsoren.",
            "Kosteneffizienz": "Optimierung der Ausgabenstruktur zur Erzielung einer 'schwarzen Null'."
        }
    },
    "Personal": { 
        weight: 0.10, 
        criteria: {
            "Personalstruktur & -planung": "Angemessenheit der Besetzung in Relation to den Aufgaben und Zielen.",
            "Qualifikation & Weiterbildung": "Fachkompetenz and kontinuierliche Förderung der Mitarbeiter (fachlich/überfachlich).",
            "Mitarbeiterzufriedenheit": "Betriebsklima, Feedbackkultur und langfristige Bindung des Personals.",
            "Ehrenamt & Freiwillige": "Strukturierte Einbindung, Betreuung und Anerkennung von ehrenamtlichem Engagement."
        }
    },
    "Strategie/Ausrichtung": { 
        weight: 0.10, 
        criteria: {
            "Sammlungskonzept": "Schriftlich fixierte Strategie für Erwerb, Bewahrung, Forschung und Entsammlung.",
            "Forschung & Wissenschaft": "Systematische Untersuchung der Bestände und Generierung neuen Wissens.",
            "Digitalstrategie": "Plan zum Einsatz digitaler Technologien in Vermittlung, Verwaltung und Marketing."
        }
    },
    "Angebote/Ausstellungsmanagement": { 
        weight: 0.15, 
        criteria: {
            "Dauerausstellung (Gestaltung)": "Qualität der Kernpräsentation hinsichtlich Layout, Didaktik und Ästhetik.",
            "Sonderausstellungen (Qualität)": "Inhaltliche Tiefe, Originalität und Zielgruppenrelevanz des Wechselprogramms.",
            "Vermittlungsprogramme": "Pädagogische Angebote für verschiedene Altersgruppen und Bildungshintergründe.",
            "Veranstaltungen & Events": "Erfolg und Qualität von Vorträgen, Konzerten und Themenabenden."
        }
    },
    "Betrieb": { 
        weight: 0.05, 
        criteria: {
            "Gebäudemanagement": "Verwaltung und Instandhaltung der Bausubstanz and Außenanlagen.",
            "Sicherheit & Aufsicht": "Maßnahmen zum Schutz von Exponaten, Besuchern und Mitarbeitern.",
            "Besucherservice & Infrastruktur": "Qualität von Empfang, Gebühren, Sanitäranlagen und Leitsystem.",
            "Technik & Ausstattung": "Technische Infrastruktur wie Klima, Beleuchtung und Medientechnik."
        }
    },
    "Nachhaltigkeit & Umwelt": {
        weight: 0.10,
        criteria: {
            "Energiemanagement & Effizienz": "Nutzung erneuerbarer Energien, effiziente Heiz-/Kühlsysteme, Beleuchtungskonzepte.",
            "Ressourcenverbrauch & Kreislaufwirtschaft": "Abfallvermeidung, Recyclingquoten, nachhaltige Materialbeschaffung.",
            "Nachhaltige Mobilität": "Erreichbarkeit mit ÖPNV, Fahrradinfrastruktur, CO2-neutrale Anreiseangebote.",
            "Nachhaltigkeitsbericht & Zertifizierung": "Vorhandensein einer CO2-Bilanzierung, Streben nach Umweltzertifizierungen."
        }
    },
    "Marketing/Publikumsorientierung": { 
        weight: 0.10, 
        criteria: {
            "Markenstrategie & Positionierung": "Entwicklung einer einzigartigen Identität und eines klaren Profils.",
            "Besucheranalyse & -bindung": "Systematische Erfassung und Auswertung von Daten über das Besucherverhalten.",
            "Preisgestaltung & Ticketing": "Management des Ticketverkaufs und Attraktivität der Preismodelle.",
            "Barrierefreiheit": "Gestaltung für Menschen mit körperlichen oder kognitiven Beeinträchtigungen."
        }
    },
    "Kommunikation": { 
        weight: 0.05, 
        criteria: {
            "Presse- & Öffentlichkeitsarbeit": "Gezielte Steuerung der Kommunikation mit Medien und Öffentlichkeit.",
            "Social Media & Online-Präsenz": "Nutzung digitaler Kanäle zur Interaktion und Reichweitensteigerung.",
            "Publikationen & Kataloge": "Qualität gedruckter oder digitaler Begleitmaterialien zur Wissensvermittlung.",
            "Corporate Design": "Einheitliches visuelles Erscheinungsbild über alle Kanäle hinweg."
        }
    },
    "Netzwerk": { 
        weight: 0.05, 
        criteria: {
            "Kooperationen (lokal/regional)": "Zusammenarbeit mit Schulen, Tourismusverbänden und lokalen Akteuren.",
            "Nationale & internationale Vernetzung": "Strategische Verbindungen und Mitgliedschaften in Fachverbänden.",
            "Einbindung in die Community": "Aktive Bemühungen, Teil der lokalen Identität und Gemeinschaft zu sein.",
            "Umgang mit Leihgebern & Partnern": "Transparente Kommunikation und gegenseitiger Respekt in Kooperationen."
        }
    },
    "Analyse/Nachbereitung": { 
        weight: 0.05, 
        criteria: {
            "Besucherforschung & Evaluation": "Systematische Erhebung von Daten zu Motivation und Erwartungen der Besucher.",
            "Erfolgsmessung (KPIs)": "Quantitative und qualitative Bewertung mittels Kennzahlen (KPIs).",
            "Qualitätsmanagement": "Systematischer Ansatz zur Steuerung und Verbesserung interner Prozesse.",
            "Innovationsfähigkeit": "Fähigkeit, neue Trends zu erkennen und in Angebote umzusetzen."
        }
    }
};

const CATEGORIES = Object.keys(C_DATA);

const getScoreColor = (score) => {
    if (score === 0 || score === undefined || isNaN(score)) return '#94a3b8'; 
    if (score <= 1.5) return '#ef4444'; 
    if (score <= 2.5) return '#f97316'; 
    if (score <= 3.5) return '#facc15'; 
    if (score <= 4.5) return '#3b82f6'; 
    return '#22c55e'; 
};

const getScoreRGB = (score) => {
    if (score === 0 || score === undefined || isNaN(score)) return [148, 163, 184];
    if (score <= 1.5) return [239, 68, 68];
    if (score <= 2.5) return [249, 115, 22];
    if (score <= 3.5) return [250, 204, 21];
    if (score <= 4.5) return [59, 130, 246];
    return [34, 197, 94];
};

const getBase64ImageFromURL = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            try {
                const dataURL = canvas.toDataURL("image/png");
                resolve(dataURL);
            } catch (e) {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
};

const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [0, 90, 156];
};

const Logo = () => (
    <div className="logo-text">KULTIQ</div>
);

const LandingPage = ({ onStartApp, onLoadDemo }) => {
    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="landing-container bg-white min-h-screen"
        >
            {/* Hero Section */}
            <section className="relative py-20 px-6 overflow-hidden bg-slate-900 text-white">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#005A9C_0%,transparent_50%)]"></div>
                </div>
                <div className="max-w-6xl mx-auto relative z-10 text-center">
                    <motion.h1 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight"
                    >
                        KULTIQ <span className="text-sky-400">Audit</span>
                    </motion.h1>
                    <motion.p 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-xl md:text-2xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed"
                    >
                        Die intelligente Plattform für die strukturierte Evaluation und strategische Weiterentwicklung von Museen und Kultureinrichtungen.
                    </motion.p>
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                        <button 
                            onClick={onStartApp}
                            className="px-8 py-4 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 group"
                        >
                            Jetzt Audit starten <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button 
                            onClick={onLoadDemo}
                            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-lg transition-all backdrop-blur-sm"
                        >
                            Demo ansehen
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* Target Groups */}
            <section className="py-24 px-6 bg-slate-50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Einsatzbereiche</h2>
                        <p className="text-slate-600 max-w-2xl mx-auto">KULTIQ bietet maßgeschneiderte Analyse-Frameworks für verschiedene Akteure im Kulturbereich.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <LayoutDashboard className="w-10 h-10 text-sky-500" />,
                                title: "Museen & Galerien",
                                desc: "Strukturierte Analyse von Sammlungsmanagement, Ausstellungsqualität und Betriebsabläufen."
                            },
                            {
                                icon: <GraduationCap className="w-10 h-10 text-emerald-500" />,
                                title: "Bildungseinrichtungen",
                                desc: "Evaluation von Vermittlungsprogrammen und pädagogischen Angeboten für Schulen und Universitäten."
                            },
                            {
                                icon: <Users className="w-10 h-10 text-violet-500" />,
                                title: "Kulturverwaltung",
                                desc: "Strategische Steuerung und Qualitätsmonitoring für Stiftungen und öffentliche Träger."
                            }
                        ].map((item, i) => (
                            <motion.div 
                                key={i}
                                whileHover={{ y: -5 }}
                                className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100"
                            >
                                <div className="mb-6">{item.icon}</div>
                                <h3 className="text-xl font-bold mb-3 text-slate-900">{item.title}</h3>
                                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-24 px-6">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8">Warum KULTIQ?</h2>
                        <div className="space-y-6">
                            {[
                                { title: "KI-gestützte Analyse", desc: "Erhalten Sie sofortige strategische Handlungsempfehlungen basierend auf Ihren Audit-Daten.", icon: <Zap className="text-sky-500" /> },
                                { title: "Ganzheitlicher Ansatz", desc: "10 Kernkategorien decken alle Aspekte vom Finanzmanagement bis zur Barrierefreiheit ab.", icon: <CheckCircle2 className="text-emerald-500" /> },
                                { title: "Professionelle Reports", desc: "Generieren Sie druckfertige PDF-Berichte mit Spider-Charts und SWOT-Analysen.", icon: <BarChart3 className="text-violet-500" /> },
                                { title: "Sicher & Lokal", desc: "Ihre Daten bleiben in Ihrem Browser (LocalStorage) oder werden sicher exportiert.", icon: <ShieldCheck className="text-slate-700" /> }
                            ].map((f, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="mt-1">{f.icon}</div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{f.title}</h4>
                                        <p className="text-slate-600">{f.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative">
                        <div className="bg-slate-900 rounded-3xl p-4 shadow-2xl transform rotate-2">
                            <img 
                                src="https://picsum.photos/seed/museum-app/800/600" 
                                alt="App Screenshot Placeholder" 
                                className="rounded-2xl opacity-80"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                        <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 hidden sm:block">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                <span className="text-sm font-bold text-slate-900">Audit Status: Abgeschlossen</span>
                            </div>
                            <div className="text-2xl font-black text-sky-600">4.8 / 5.0</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-6 bg-sky-600 text-white text-center">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">Bereit für die Zukunft Ihrer Einrichtung?</h2>
                    <p className="text-sky-100 mb-10 text-lg">Starten Sie noch heute mit der ersten Evaluation und entdecken Sie ungenutzte Potenziale.</p>
                    <button 
                        onClick={onStartApp}
                        className="px-10 py-5 bg-white text-sky-600 hover:bg-sky-50 rounded-2xl font-black text-xl transition-all shadow-xl"
                    >
                        Kostenlos starten
                    </button>
                </div>
            </section>

            <footer className="py-12 px-6 border-t border-slate-100 text-center text-slate-400 text-sm">
                <p>&copy; 2026 KULTIQ Audit-Tool. Alle Rechte vorbehalten.</p>
            </footer>
        </motion.div>
    );
};

const AdminPanel = ({ user }) => {
    const [users, setUsers] = useState([]);
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    useEffect(() => {
        if (!user) return;
        const fetchAdminData = async () => {
            setLoading(true);
            setError('');
            try {
                // 1. Try Firestore users collection first
                const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
                const fsUsers = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

                // 2. Also try /api/admin/users if available to merge any Auth-only users
                let apiUsers = [];
                try {
                    const token = await user.getIdToken();
                    const res = await fetch('/api/admin/users', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data)) {
                            apiUsers = data.map(u => ({
                                uid: u.uid,
                                email: u.email,
                                role: u.email === 'awtrp1@gmail.com' ? 'admin' : 'user',
                                createdAt: u.metadata?.creationTime || ''
                            }));
                        }
                    }
                } catch (apiErr) {
                    console.warn("Admin API fallback to Firestore only:", apiErr);
                }

                // Merge by uid
                const mergedMap = new Map();
                apiUsers.forEach(u => mergedMap.set(u.uid, u));
                fsUsers.forEach(u => mergedMap.set(u.uid, { ...mergedMap.get(u.uid), ...u }));
                setUsers(Array.from(mergedMap.values()));

                // 3. Fetch captured leads from Firestore
                const leadsSnap = await getDocs(query(collection(db, 'leads'), orderBy('createdAt', 'desc')));
                setLeads(leadsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error("Error fetching admin data:", err);
                setError(err.message || 'Fehler beim Laden der Admin-Daten');
            } finally {
                setLoading(false);
            }
        };
        fetchAdminData();
    }, [user]);

    const formatDate = (val) => {
        if (!val) return '-';
        if (val?.toDate) return val.toDate().toLocaleString('de-DE');
        return String(val);
    };

    if (loading) return <div className="card">Lade Admin-Daten aus Firestore...</div>;

    return (
        <div className="flex flex-col gap-6">
            <div className="card">
                <h2>Benutzerverwaltung ({users.length})</h2>
                {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
                <table className="w-full text-left border-collapse mt-4">
                    <thead>
                        <tr className="border-b border-slate-200 text-slate-600 text-sm">
                            <th className="p-3">E-Mail</th>
                            <th className="p-3">Rolle</th>
                            <th className="p-3">Erstellt / Letzter Login</th>
                            <th className="p-3">UID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr><td colSpan={4} className="p-4 text-slate-400 text-center">Noch keine Benutzer registriert.</td></tr>
                        ) : users.map(u => (
                            <tr key={u.uid} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-3 font-medium">{u.email}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.role === 'admin' || u.email === 'awtrp1@gmail.com' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>
                                        {u.role || (u.email === 'awtrp1@gmail.com' ? 'admin' : 'berater')}
                                    </span>
                                </td>
                                <td className="p-3 text-sm text-slate-500">{formatDate(u.lastLoginAt || u.createdAt)}</td>
                                <td className="p-3 text-xs font-mono text-slate-400">{u.uid}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="card">
                <h2>Erfasste Demo-Leads ({leads.length})</h2>
                <table className="w-full text-left border-collapse mt-4">
                    <thead>
                        <tr className="border-b border-slate-200 text-slate-600 text-sm">
                            <th className="p-3">E-Mail</th>
                            <th className="p-3">Museum / Einrichtung</th>
                            <th className="p-3">Gesamtscore</th>
                            <th className="p-3">Datum</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leads.length === 0 ? (
                            <tr><td colSpan={4} className="p-4 text-slate-400 text-center">Noch keine Demo-Anfragen vorhanden.</td></tr>
                        ) : leads.map(l => (
                            <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-3 font-medium">{l.email}</td>
                                <td className="p-3">{l.museumName || '-'}</td>
                                <td className="p-3 font-bold text-sky-600">{typeof l.overallScore === 'number' ? l.overallScore.toFixed(2) : '-'}</td>
                                <td className="p-3 text-sm text-slate-500">{formatDate(l.createdAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const App = () => {
    const DEMO_ACTIVE_CATEGORIES = ["Strategie/Ausrichtung", "Marketing/Publikumsorientierung"];

    const [user, setUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setIsAuthLoading(false);
            if (currentUser) {
                try {
                    await setDoc(doc(db, 'users', currentUser.uid), {
                        uid: currentUser.uid,
                        email: currentUser.email || '',
                        role: currentUser.email === 'awtrp1@gmail.com' ? 'admin' : 'berater',
                        lastLoginAt: serverTimestamp(),
                        createdAt: currentUser.metadata?.creationTime || new Date().toISOString()
                    }, { merge: true });
                } catch (err) {
                    console.warn("Firestore user sync warning:", err);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const isDemo = !user;

    const handleAuthAction = async (e) => {
        e.preventDefault();
        setLoginError('');
        try {
            if (isRegistering) {
                await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
            } else {
                await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
            }
            setShowLoginModal(false);
            setLoginEmail('');
            setLoginPassword('');
        } catch (err) {
            setLoginError(err.message);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
    };

    const [savedReviews, setSavedReviews] = useState([]);
    const [branding, setBranding] = useState({
        primaryColor: '#005A9C',
        logoUrl: DEFAULT_LOGO
    });
    const [review, setReview] = useState({ 
        id: `rev_${Date.now()}`, 
        museumInfo: { name: '', reviewer: '', date: new Date().toISOString().split('T')[0] }, 
        ratings: {}, 
        comments: {}, 
        report: null 
    });
    const [activeTab, setActiveTab] = useState('landing');
    const [isLoading, setIsLoading] = useState(false);
    const [expandedCats, setExpandedCats] = useState(new Set(isDemo ? DEMO_ACTIVE_CATEGORIES : [CATEGORIES[0]]));
    const [showLeadModal, setShowLeadModal] = useState(false);
    const [leadEmail, setLeadEmail] = useState('');
    const [showIntroHint, setShowIntroHint] = useState(true);

    useEffect(() => {
        const storedBranding = JSON.parse(localStorage.getItem('kultiqBranding'));
        if (storedBranding) setBranding(storedBranding);

        const r = {}, c = {};
        CATEGORIES.forEach(cat => Object.keys(C_DATA[cat].criteria).forEach(crit => {
            r[`${cat}-${crit}`] = 0;
            c[`${cat}-${crit}`] = '';
        }));
        setReview(prev => ({...prev, ratings: {...r, ...prev.ratings}, comments: {...c, ...prev.comments}}));
    }, []);

    useEffect(() => {
        if (!user) {
            const stored = JSON.parse(localStorage.getItem('museumReviews') || '[]');
            setSavedReviews(stored);
            return;
        }
        const q = user.email === 'awtrp1@gmail.com'
            ? query(collection(db, 'reviews'))
            : query(collection(db, 'reviews'), where('uid', '==', user.uid));
        const unsub = onSnapshot(q, (snapshot) => {
            const allReviews = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setSavedReviews(allReviews);
        }, (err) => {
            console.warn("Firestore reviews listener fallback to localStorage:", err);
            const stored = JSON.parse(localStorage.getItem('museumReviews') || '[]');
            setSavedReviews(stored);
        });
        return () => unsub();
    }, [user]);

    useEffect(() => {
        localStorage.setItem('kultiqBranding', JSON.stringify(branding));
    }, [branding]);

    const categoryScores = useMemo(() => {
        const scores = {};
        CATEGORIES.forEach(cat => {
            const crits = Object.keys(C_DATA[cat].criteria);
            const vals = crits.map(c => review.ratings[`${cat}-${c}`]).filter(v => v > 0);
            scores[cat] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        });
        return scores;
    }, [review.ratings]);

    const overallScore = useMemo(() => {
        let total = 0, weightSum = 0;
        CATEGORIES.forEach(cat => {
            if (categoryScores[cat] > 0) {
                total += categoryScores[cat] * C_DATA[cat].weight;
                weightSum += C_DATA[cat].weight;
            }
        });
        return weightSum > 0 ? total / weightSum : 0;
    }, [categoryScores]);

    const toggleCat = (cat) => {
        setExpandedCats(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

    const handleSaveCurrent = async () => {
        const reviewToSave = {
            ...review,
            uid: user ? user.uid : 'anonymous',
            updatedAt: new Date().toISOString()
        };
        const updated = [...savedReviews.filter(r => r.id !== review.id), reviewToSave];
        localStorage.setItem('museumReviews', JSON.stringify(updated));
        setSavedReviews(updated);

        if (user) {
            try {
                await setDoc(doc(db, 'reviews', review.id), reviewToSave, { merge: true });
            } catch (err) {
                console.error("Fehler beim Speichern in Firestore:", err);
            }
        }
        alert("Audit wurde erfolgreich gespeichert.");
    };

    const handleSaveAsDemo = async () => {
        const demoRev = {
            ...review,
            id: `demo_save_${Date.now()}`,
            uid: user ? user.uid : 'anonymous',
            updatedAt: new Date().toISOString(),
            museumInfo: {
                ...review.museumInfo,
                name: `DEMO: ${review.museumInfo.name || 'Unbenanntes Objekt'}`
            }
        };
        const updated = [...savedReviews, demoRev];
        localStorage.setItem('museumReviews', JSON.stringify(updated));
        setSavedReviews(updated);

        if (user) {
            try {
                await setDoc(doc(db, 'reviews', demoRev.id), demoRev, { merge: true });
            } catch (err) {
                console.error("Fehler beim Speichern des Demo-Audits in Firestore:", err);
            }
        }
        setActiveTab('history');
        alert("Aktuelles Audit wurde als DEMO im Archiv gespeichert!");
    };

    const handleDeleteReview = async (reviewId) => {
        const f = savedReviews.filter(sr => sr.id !== reviewId);
        localStorage.setItem('museumReviews', JSON.stringify(f));
        setSavedReviews(f);
        if (user) {
            try {
                await deleteDoc(doc(db, 'reviews', reviewId));
            } catch (err) {
                console.error("Fehler beim Löschen in Firestore:", err);
            }
        }
    };

    const handleStartNewAudit = () => {
        const r = {}, c = {};
        CATEGORIES.forEach(cat => Object.keys(C_DATA[cat].criteria).forEach(crit => {
            r[`${cat}-${crit}`] = 0;
            c[`${cat}-${crit}`] = '';
        }));
        setReview({
            id: `rev_${Date.now()}`,
            museumInfo: { name: '', reviewer: '', date: new Date().toISOString().split('T')[0] },
            ratings: r,
            comments: c,
            report: null
        });
        setExpandedCats(new Set(isDemo ? DEMO_ACTIVE_CATEGORIES : [CATEGORIES[0]]));
        setShowIntroHint(true);
        setActiveTab('info');
    };

    const handleLoadDemo = () => {
        const r = {};
        const c = {};
        CATEGORIES.forEach((cat, index) => {
            Object.keys(C_DATA[cat].criteria).forEach((crit, critIndex) => {
                const key = `${cat}-${crit}`;
                r[key] = (index + critIndex) % 2 === 0 ? 5 : 4;
                if (cat === "Finanzierung" && crit === "Drittmittel & Sponsoring") r[key] = 2;
                if (cat === "Netzwerk") r[key] = 3;
            });
        });
        setReview({
            id: `rev_demo_${Date.now()}`,
            museumInfo: { name: "Beispiel Ausstellung", reviewer: "Fachauditor Demo", date: new Date().toISOString().split('T')[0] },
            ratings: r,
            comments: c,
            report: null 
        });
        setExpandedCats(new Set(CATEGORIES.slice(0, 3)));
        setActiveTab('audit');
    };

    const handleDownloadCSV = () => {
        let csv = '\uFEFF'; // BOM for Excel/Sheets UTF-8 compatibility
        csv += 'Kategorie;Gewichtung;Kriterium;Beschreibung;Bewertung (1-5);Kommentar\n';
        CATEGORIES.forEach(cat => {
            const weight = (C_DATA[cat].weight * 100).toFixed(0) + '%';
            Object.entries(C_DATA[cat].criteria).forEach(([crit, desc]) => {
                csv += `${cat};${weight};${crit};"${desc.replace(/"/g, '""')}";;\n`;
            });
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'KULTIQ_Audit_Protokoll_Leer.csv';
        link.click();
    };

    const triggerGenerateProcess = () => {
        if (isDemo && !leadEmail) {
            setShowLeadModal(true);
            return;
        }
        handleGenerate();
    };

    const handleGenerate = async () => {
        if (showLeadModal) {
            setShowLeadModal(false);
            if (leadEmail && leadEmail.includes('@')) {
                try {
                    const leadId = `lead_${Date.now()}`;
                    await setDoc(doc(db, 'leads', leadId), {
                        email: leadEmail,
                        museumName: review.museumInfo?.name || 'Unbenannt',
                        overallScore: Number(overallScore) || 0,
                        createdAt: serverTimestamp()
                    });
                } catch (leadErr) {
                    console.warn("Konnte Lead nicht in Firestore speichern:", leadErr);
                }
            }
        }
        setIsLoading(true);
        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    museumInfo: review.museumInfo,
                    ratings: review.ratings,
                    comments: review.comments,
                    CATEGORIES,
                    C_DATA,
                    categoryScores,
                    overallScore,
                    isDemo
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Fehler bei der KI-Generierung");
            }
            
            const parsed = await response.json();
            setReview(prev => ({ ...prev, report: parsed }));
            setActiveTab('report');
        } catch (e) { 
            console.error("AI Generation Error:", e); 
            alert("Fehler bei der KI-Generierung: " + e.message); 
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        const doc = new jsPDF();
        const { museumInfo, report, ratings, comments } = review;
        const mainColor = hexToRgb(branding.primaryColor);
        let currentPage = 1;

        let logoData = null;
        try {
            logoData = await getBase64ImageFromURL(branding.logoUrl);
        } catch (e) { console.log("Logo load failed"); }

        const addPageFooter = () => {
            doc.setFontSize(8).setTextColor(150).setFont("helvetica", "normal");
            doc.text("KULTIQ Kultur analysieren. Zukunft gestalten.", 20, 285);
            doc.text(museumInfo.name || "Museum", 105, 285, { align: 'center' });
            doc.text(`${museumInfo.date} | Seite ${currentPage}`, 190, 285, { align: 'right' });
        };

        const checkNewPage = (y, buffer = 20) => {
            if (y > 270 - buffer) {
                addPageFooter();
                doc.addPage();
                currentPage++;
                return 25;
            }
            return y;
        };

        // Helper: Draw Radar Chart in PDF
        const drawRadarPDF = (x, y, r, scores, color) => {
            const num = CATEGORIES.length;
            doc.setDrawColor(140).setLineWidth(0.4); // Darker and slightly thicker for visibility
            for (let l = 1; l <= 5; l++) {
                const pts = [];
                for (let i = 0; i < num; i++) {
                    const a = (i / num) * 2 * Math.PI - Math.PI / 2;
                    pts.push({x: x + (l/5)*r * Math.cos(a), y: y + (l/5)*r * Math.sin(a)});
                }
                pts.forEach((p, i) => doc.line(p.x, p.y, pts[(i+1)%pts.length].x, pts[(i+1)%pts.length].y));
            }
            for (let i = 0; i < num; i++) {
                const a = (i / num) * 2 * Math.PI - Math.PI / 2;
                doc.line(x, y, x + r * Math.cos(a), y + r * Math.sin(a));
            }
            const dataPts = CATEGORIES.map((cat, i) => {
                const a = (i / num) * 2 * Math.PI - Math.PI / 2;
                const dist = ((scores[cat] || 0) / 5) * r;
                return {x: x + dist * Math.cos(a), y: y + dist * Math.sin(a)};
            });
            doc.setDrawColor(color[0], color[1], color[2]).setLineWidth(1.0); // Slightly bolder outline
            dataPts.forEach((p, i) => {
                doc.line(p.x, p.y, dataPts[(i+1)%dataPts.length].x, dataPts[(i+1)%dataPts.length].y);
                doc.setFillColor(color[0], color[1], color[2]).circle(p.x, p.y, 1.2, 'F');
            });
            doc.setFontSize(7).setTextColor(80).setFont("helvetica", "bold");
            CATEGORIES.forEach((cat, i) => {
                const a = (i / num) * 2 * Math.PI - Math.PI / 2;
                const lx = x + (r + 15) * Math.cos(a);
                const ly = y + (r + 15) * Math.sin(a);
                doc.text(`${cat} (${scores[cat]?.toFixed(1) || '0.0'})`, lx, ly, { align: lx > x + 5 ? 'left' : lx < x - 5 ? 'right' : 'center' });
            });
        };

        // --- 1. TITLE PAGE ---
        if (logoData) doc.addImage(logoData, 'PNG', 55, 40, 100, 30, undefined, 'FAST');
        else doc.setFontSize(40).setTextColor(mainColor[0], mainColor[1], mainColor[2]).setFont("helvetica", "bold").text("KULTIQ", 105, 60, { align: 'center' });
        doc.setFontSize(30).setTextColor(0).setFont("helvetica", "bold").text("AUDIT-BERICHT", 105, 110, { align: 'center' });
        doc.setDrawColor(mainColor[0], mainColor[1], mainColor[2]).setLineWidth(1.5).line(40, 120, 170, 120);
        doc.setFontSize(22).setTextColor(50).setFont("helvetica", "normal").text(museumInfo.name || "Audit", 105, 145, { align: 'center' });
        doc.setFontSize(14).setTextColor(100).text(`Auditor: ${museumInfo.reviewer || "Dipl.-Auditor"}`, 105, 165, { align: 'center' });
        doc.text(`Datum des Audits: ${museumInfo.date}`, 105, 175, { align: 'center' });
        addPageFooter();

        // --- 2. SUMMARY & RECOMMENDATIONS ---
        doc.addPage(); currentPage++;
        doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(mainColor[0], mainColor[1], mainColor[2]).text("KI-Analyse & Empfehlungen", 20, 25);
        doc.setFontSize(14).setTextColor(0).text("Schriftliche Zusammenfassung", 20, 40);
        doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(40);
        const splitSum = doc.splitTextToSize(report?.summary || "Kein Bericht generiert.", 170);
        doc.text(splitSum, 20, 50);
        let yPos = 50 + (splitSum.length * 5) + 15;
        doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(0).text("Handlungsempfehlungen", 20, yPos);
        yPos += 12;
        if (report?.recommendations) {
            report.recommendations.forEach(rec => {
                yPos = checkNewPage(yPos, 20);
                doc.setFontSize(11).setFont("helvetica", "bold").text(`Bereich: ${rec.area}`, 20, yPos);
                yPos += 7;
                rec.items.forEach(it => {
                    const l = doc.splitTextToSize(`• ${it}`, 165);
                    yPos = checkNewPage(yPos, l.length * 5);
                    doc.setFontSize(10).setFont("helvetica", "normal").setTextColor(60).text(l, 25, yPos);
                    yPos += (l.length * 5) + 1;
                });
                yPos += 5;
            });
        }
        addPageFooter();

        // --- 3. CONSULTING ---
        doc.addPage(); currentPage++;
        doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(mainColor[0], mainColor[1], mainColor[2]).text("Beratungsdienstleistungen", 20, 25);
        yPos = 45;
        if (report?.consulting) {
            report.consulting.forEach(srv => {
                yPos = checkNewPage(yPos, 15);
                doc.setFontSize(11).setFont("helvetica", "bold").text(srv.area, 20, yPos);
                yPos += 7;
                srv.items.forEach(it => {
                    const l = doc.splitTextToSize(`• ${it}`, 165);
                    yPos = checkNewPage(yPos, l.length * 5);
                    doc.setFontSize(10).setFont("helvetica", "normal").setTextColor(60).text(l, 25, yPos);
                    yPos += (l.length * 5) + 1;
                });
                yPos += 5;
            });
        }
        addPageFooter();

        // --- 4. SWOT ---
        doc.addPage(); currentPage++;
        doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(mainColor[0], mainColor[1], mainColor[2]).text("SWOT-Analyse", 20, 25);
        yPos = 45;
        if (report?.swot) {
            const drawBox = (title, items, x, color) => {
                doc.setTextColor(color[0], color[1], color[2]);
                doc.setFontSize(11).setFont("helvetica", "bold").text(title, x, yPos);
                let ly = yPos + 8;
                (items || []).forEach(it => {
                    doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(60);
                    const lines = doc.splitTextToSize(`• ${it}`, 75);
                    doc.text(lines, x, ly);
                    ly += (lines.length * 4.5) + 1;
                });
                return ly;
            };
            const y1 = drawBox("Stärken (Strengths)", report.swot.strengths, 20, [22, 101, 52]);
            const y2 = drawBox("Schwächen (Weaknesses)", report.swot.weaknesses, 110, [153, 27, 27]);
            yPos = Math.max(y1, y2) + 15;
            drawBox("Chancen (Opportunities)", report.swot.opportunities, 20, [30, 64, 175]);
            drawBox("Risiken (Threats)", report.swot.threats, 110, [146, 64, 14]);
        }
        addPageFooter();

        // --- 5. SPIDER ---
        doc.addPage(); currentPage++;
        doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(mainColor[0], mainColor[1], mainColor[2]).text("Spider-Grafik der Kategorien", 20, 25);
        drawRadarPDF(105, 100, 60, categoryScores, mainColor);
        addPageFooter();

        // --- 6. BARS ---
        doc.addPage(); currentPage++;
        doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(mainColor[0], mainColor[1], mainColor[2]).text("Balkenauswertung & Gewichtung", 20, 25);
        yPos = 45;
        CATEGORIES.forEach(cat => {
            const sc = categoryScores[cat];
            const weight = (C_DATA[cat].weight * 100).toFixed(0);
            
            // Measure cat name to handle multi-line
            doc.setFontSize(10).setFont("helvetica", "bold").setTextColor(60);
            const splitCat = doc.splitTextToSize(cat, 60);
            
            const itemHeight = Math.max(25, splitCat.length * 6 + 10);
            yPos = checkNewPage(yPos, itemHeight);

            doc.text(splitCat, 20, yPos);
            
            // Weight below cat name
            const weightY = yPos + (splitCat.length * 5) + 1;
            doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(120);
            doc.text(`(Gewichtung: ${weight}%)`, 20, weightY);

            // Bar to the right
            doc.setFillColor(240, 240, 240).rect(85, yPos - 4, 90, 8, "F");
            if (sc > 0) {
                const rgb = getScoreRGB(sc);
                doc.setFillColor(rgb[0], rgb[1], rgb[2]).rect(85, yPos - 4, (sc / 5) * 90, 8, "F");
                doc.setTextColor(rgb[0], rgb[1], rgb[2]).setFontSize(10).text(sc.toFixed(2), 180, yPos);
            }
            yPos += itemHeight;
        });
        addPageFooter();

        // --- 7. PROTOCOL ---
        doc.addPage(); currentPage++;
        doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(mainColor[0], mainColor[1], mainColor[2]).text("Audit-Protokoll Details", 20, 25);
        yPos = 45;
        CATEGORIES.forEach(cat => {
            yPos = checkNewPage(yPos, 30);
            doc.setFontSize(14).setFont("helvetica", "bold").setTextColor(mainColor[0], mainColor[1], mainColor[2]).text(`${cat} (Score: ${categoryScores[cat].toFixed(2)})`, 20, yPos);
            yPos += 12;
            Object.keys(C_DATA[cat].criteria).forEach(crit => {
                const key = `${cat}-${crit}`;
                const val = ratings[key] || 0;
                const comm = comments[key] || "";
                yPos = checkNewPage(yPos, 15);
                doc.setFontSize(11).setFont("helvetica", "bold").setTextColor(0).text(crit, 25, yPos);
                for(let i=1; i<=5; i++) {
                    doc.setDrawColor(220);
                    doc.setFillColor(val >= i ? getScoreRGB(val)[0] : 245, val >= i ? getScoreRGB(val)[1] : 245, val >= i ? getScoreRGB(val)[2] : 245);
                    doc.circle(150 + i * 8, yPos - 1.5, 2.5, val >= i ? 'FD' : 'F');
                }
                doc.setFontSize(10).setTextColor(val > 0 ? getScoreRGB(val)[0] : 150).text(val > 0 ? val.toString() : "N/A", 198, yPos, { align: 'right' });
                yPos += 6;
                if (comm) {
                    const l = doc.splitTextToSize(`Kommentar: ${comm}`, 155);
                    yPos = checkNewPage(yPos, l.length * 5);
                    doc.setFontSize(9).setFont("helvetica", "italic").setTextColor(80).text(l, 30, yPos);
                    yPos += (l.length * 5) + 3;
                } else { yPos += 2; }
            });
            yPos += 8;
        });
        addPageFooter();

        // --- 8. GLOSSARY ---
        doc.addPage(); currentPage++;
        doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(mainColor[0], mainColor[1], mainColor[2]).text("Glossar", 20, 25);
        yPos = 45;
        CATEGORIES.forEach(cat => {
            yPos = checkNewPage(yPos, 25);
            doc.setFontSize(13).setFont("helvetica", "bold").setTextColor(mainColor[0], mainColor[1], mainColor[2]).text(cat, 20, yPos);
            yPos += 8;
            Object.entries(C_DATA[cat].criteria).forEach(([crit, desc]) => {
                yPos = checkNewPage(yPos, 15);
                doc.setFontSize(10).setFont("helvetica", "bold").setTextColor(0).text(crit, 25, yPos);
                yPos += 5;
                const l = doc.splitTextToSize(desc, 155);
                yPos = checkNewPage(yPos, l.length * 5);
                doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(80).text(l, 25, yPos);
                yPos += (l.length * 5) + 4;
            });
            yPos += 4;
        });
        addPageFooter();
        doc.save(`KULTIQ_Audit_${museumInfo.name || 'Bericht'}.pdf`);
    };

    return (
        <div className="app-container">
            <aside className="sidebar">
                <div className="brand-wrapper">
                    <Logo />
                    <div className="sidebar-tagline">Kultur analysieren.<br/>Zukunft gestalten.</div>
                </div>
                <div className="sidebar-content">
                    <nav>
                        <button className={activeTab === 'landing' ? 'active' : ''} onClick={() => setActiveTab('landing')}><Home size={18} style={{display: 'inline', marginRight: '8px'}} /> Startseite</button>
                        <button className={activeTab === 'info' ? 'active' : ''} onClick={() => setActiveTab('info')}><Info size={18} style={{display: 'inline', marginRight: '8px'}} /> Stammdaten</button>
                        <button className={activeTab === 'audit' ? 'active' : ''} onClick={() => setActiveTab('audit')}><Star size={18} style={{display: 'inline', marginRight: '8px'}} /> Audit-Protokoll</button>
                        <button className={activeTab === 'report' ? 'active' : ''} onClick={() => setActiveTab('report')}><FileText size={18} style={{display: 'inline', marginRight: '8px'}} /> Bericht & KI</button>
                        <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}><Archive size={18} style={{display: 'inline', marginRight: '8px'}} /> Archiv</button>
                        <button className={activeTab === 'manual' ? 'active' : ''} onClick={() => setActiveTab('manual')}><BookOpen size={18} style={{display: 'inline', marginRight: '8px'}} /> Online Manual</button>
                        {user && user.email === 'awtrp1@gmail.com' && (
                            <button className={activeTab === 'admin' ? 'active' : ''} onClick={() => setActiveTab('admin')}><ShieldCheck size={18} style={{display: 'inline', marginRight: '8px'}} /> Admin</button>
                        )}
                    </nav>

                    <div className="sidebar-bottom">
                        <div className="score-ring">
                            <span className="score-val" style={{ color: getScoreColor(overallScore) }}>{overallScore.toFixed(2)}</span>
                            <span className="score-label">Gesamtscore</span>
                        </div>
                        <div className="sidebar-actions">
                            <button onClick={handleSaveCurrent} className="btn-save">💾 Sichern</button>
                            <button onClick={handleSaveAsDemo} className="btn-save" style={{background: '#7c3aed'}}>💾 Als Demo sichern</button>
                            <button onClick={handleLoadDemo} className="btn-demo" style={{background: '#f59e0b', color: 'white'}}>🧪 Demo laden</button>
                            <button onClick={handleDownloadCSV} className="btn-csv" style={{background: '#334155', color: 'white'}}>📊 Protokoll (Sheets/Excel)</button>
                            <button onClick={handleDownloadPDF} className="btn-pdf" disabled={!review.report}>📄 PDF Export</button>
                            
                            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
                            {!user ? (
                                <button onClick={() => setShowLoginModal(true)} style={{background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#94a3b8'}}>🔒 Admin Login</button>
                            ) : (
                                <button onClick={handleLogout} style={{background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5'}}>🔓 Logout ({user.email})</button>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            <main className="content" style={activeTab === 'landing' ? { padding: 0, maxWidth: 'none', margin: 0 } : {}}>
                <AnimatePresence mode="wait">
                    {activeTab === 'landing' && (
                        <LandingPage key="landing" onStartApp={handleStartNewAudit} onLoadDemo={handleLoadDemo} />
                    )}
                    {activeTab === 'manual' && (
                        <motion.div 
                            key="manual"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="card manual-content"
                        >
                            <h1>📖 Online Manual: KULTIQ</h1>
                            <p>KULTIQ ist Ihr Tool für die strukturierte Analyse und strategische Beratung von Kultureinrichtungen.</p>
                            <section><h3>1. Stammdaten</h3><p>Erfassen Sie Objektname, Datum und Auditor. Passen Sie hier auch die Berichts-Farbe und das Logo an.</p></section>
                            <section><h3>2. Audit-Protokoll</h3><p>Bewerten Sie 10 Kategorien (1-5). Die KI nutzt diese Daten für den automatischen Strategiebericht. Sie können das Protokoll auch als leere Tabelle für die Arbeit vor Ort exportieren.</p></section>
                            <section><h3>3. Bericht & KI</h3><p>Generieren Sie per Knopfdruck Analysen, Handlungsempfehlungen, SWOT und Beratungsangebote.</p></section>
                            <section><h3>4. PDF-Export</h3><p>Exportieren Sie ein druckfertiges Dokument inklusive Cover, Grafiken und Glossar.</p></section>
                        </motion.div>
                    )}
                    {activeTab === 'admin' && (
                        <motion.div 
                            key="admin"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <AdminPanel user={user} />
                        </motion.div>
                    )}

                    {activeTab === 'info' && (
                        <motion.div 
                            key="info"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            {showIntroHint ? (
                                <div className="mb-6 bg-sky-50 border border-sky-200 rounded-2xl p-5 text-slate-700 shadow-xs relative">
                                    <button 
                                        onClick={() => setShowIntroHint(false)} 
                                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
                                        title="Hinweis ausblenden"
                                    >
                                        ✕ Ausblenden
                                    </button>
                                    <div className="flex items-center gap-2 font-bold text-sky-900 text-base mb-2">
                                        <Info size={18} className="text-sky-600" />
                                        <span>Willkommen beim KULTIQ Audit – So funktioniert die Durchführung in 3 Schritten:</span>
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-4 text-sm mt-3">
                                        <div className="bg-white/80 p-3 rounded-xl border border-sky-100">
                                            <strong className="text-sky-800 block mb-1">1. Stammdaten erfassen</strong>
                                            Tragen Sie unten den Namen der Einrichtung, das Datum und den Auditor ein. Optional können Sie Farbe & Logo für den PDF-Bericht anpassen.
                                        </div>
                                        <div className="bg-white/80 p-3 rounded-xl border border-sky-100">
                                            <strong className="text-sky-800 block mb-1">2. Kriterien bewerten</strong>
                                            Klicken Sie auf <strong>„🚀 START“</strong>, um im Audit-Protokoll die Kategorien aufzuklappen und auf einer Skala von <strong>1 bis 5</strong> zu bewerten.
                                        </div>
                                        <div className="bg-white/80 p-3 rounded-xl border border-sky-100">
                                            <strong className="text-sky-800 block mb-1">3. KI-Strategiebericht</strong>
                                            Lassen Sie anschließend per Knopfdruck eine fundierte Analyse inkl. SWOT, Handlungsempfehlungen und PDF-Report erstellen.
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-4 flex justify-end">
                                    <button onClick={() => setShowIntroHint(true)} className="text-xs text-sky-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer">
                                        <Info size={14} /> Kurzanleitung einblenden
                                    </button>
                                </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 500px', gap: '2rem', alignItems: 'start' }}>
                                <div>
                                    <div className="card">
                                        <h2>Stammdaten & Branding</h2>
                                        <div className="input-grid-2">
                                            <div className="input-group"><label>Objektname</label><input autoComplete="off" value={review.museumInfo.name} onChange={(e) => setReview(p => ({...p, museumInfo: {...p.museumInfo, name: e.target.value}}))} /></div>
                                            <div className="input-group"><label>Auditdatum</label><input type="date" autoComplete="off" value={review.museumInfo.date} onChange={(e) => setReview(p => ({...p, museumInfo: {...p.museumInfo, date: e.target.value}}))} /></div>
                                            <div className="input-group"><label>Auditor</label><input autoComplete="off" value={review.museumInfo.reviewer} onChange={(e) => setReview(p => ({...p, museumInfo: {...p.museumInfo, reviewer: e.target.value}}))} /></div>
                                        </div>
                                        <hr className="divider" />
                                        <h3>Bericht-Optionen</h3>
                                        <div className="input-grid-2">
                                            <div className="input-group"><label>Primärfarbe</label><input type="color" value={branding.primaryColor} onChange={(e) => setBranding(p => ({...p, primaryColor: e.target.value}))} /></div>
                                            <div className="input-group"><label>Logo URL</label><input value={branding.logoUrl} onChange={(e) => setBranding(p => ({...p, logoUrl: e.target.value}))} /></div>
                                        </div>
                                    </div>
                                    <button 
                                        className="btn-generate"
                                        style={{ marginTop: '2rem', fontSize: '1.25rem', padding: '1.25rem', background: 'var(--primary)', boxShadow: '0 4px 14px rgba(0, 90, 156, 0.3)' }}
                                        onClick={() => setActiveTab('audit')}
                                    >
                                        🚀 START
                                    </button>
                                </div>
                                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <h3>Spider-Chart Übersicht</h3>
                                    <RadarChart data={categoryScores} />
                                </div>
                            </div>
                        </motion.div>
                    )}
                    {activeTab === 'audit' && (
                        <motion.div 
                            key="audit"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="audit-grid"
                        >
                            {showIntroHint ? (
                                <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 text-slate-700 shadow-xs relative">
                                    <button 
                                        onClick={() => setShowIntroHint(false)} 
                                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
                                        title="Hinweis ausblenden"
                                    >
                                        ✕ Ausblenden
                                    </button>
                                    <div className="flex items-center gap-2 font-bold text-sky-900 text-base mb-2">
                                        <Info size={18} className="text-sky-600" />
                                        <span>Hinweise zum Audit-Protokoll</span>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-3">
                                        Klicken Sie auf eine Kategorie, um die zugehörigen Prüfkriterien zu öffnen. Vergeben Sie pro Kriterium eine Bewertung und ergänzen Sie bei Bedarf Stichpunkte im Textfeld <em>„Anmerkungen...“</em> – die KI bezieht Ihre Notizen direkt in den Strategiebericht ein.
                                        {isDemo && <span className="block mt-1 font-semibold text-sky-800">💡 Demo-Modus: Zum schnellen Testen sind 2 Kernkategorien freigeschaltet. Für alle 10 Kategorien können Sie sich unten links als Berater/Admin einloggen.</span>}
                                    </p>
                                    <div className="flex flex-wrap gap-2 text-xs font-semibold pt-2 border-t border-sky-200/70">
                                        <span className="px-2.5 py-1 rounded-md bg-red-100 text-red-800">1 = Kritisch / Nicht vorhanden</span>
                                        <span className="px-2.5 py-1 rounded-md bg-orange-100 text-orange-800">2 = Ausbaufähig</span>
                                        <span className="px-2.5 py-1 rounded-md bg-yellow-100 text-yellow-800">3 = Solider Standard</span>
                                        <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-800">4 = Gut etabliert</span>
                                        <span className="px-2.5 py-1 rounded-md bg-green-100 text-green-800">5 = Exzellent / Vorbildlich</span>
                                        <span className="px-2.5 py-1 rounded-md bg-slate-200 text-slate-700">N/A = Nicht relevant (fließt nicht in den Score ein)</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-end">
                                    <button onClick={() => setShowIntroHint(true)} className="text-xs text-sky-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer">
                                        <Info size={14} /> Bewertungshilfe einblenden
                                    </button>
                                </div>
                            )}
                            {CATEGORIES.map(cat => {
                                const isLocked = isDemo && !DEMO_ACTIVE_CATEGORIES.includes(cat);
                                return (
                                <div key={cat} className={`audit-card ${isLocked ? 'opacity-60 grayscale relative' : ''}`}>
                                    {isLocked && (
                                        <div 
                                            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-100/40 rounded-xl cursor-pointer"
                                            onClick={() => alert("Diese Kategorie ist Teil der Vollversion. Fordern Sie jetzt Ihr Komplett-Audit an!")}
                                        >
                                            <div className="bg-slate-900 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg">
                                                🔒 PRO Version
                                            </div>
                                        </div>
                                    )}
                                    <div className="card-header" onClick={() => !isLocked && toggleCat(cat)}>
                                        <h3>{cat} ({(C_DATA[cat].weight * 100).toFixed(0)}%)</h3>
                                        <span className="badge" style={{ background: getScoreColor(categoryScores[cat]) }}>{categoryScores[cat] > 0 ? categoryScores[cat].toFixed(1) : "N/A"}</span>
                                    </div>
                                    {expandedCats.has(cat) && !isLocked && (
                                        <div className="criteria-list">
                                            {Object.entries(C_DATA[cat].criteria).map(([crit, desc]) => {
                                                const key = `${cat}-${crit}`;
                                                return (
                                                    <div key={crit} className="crit-item">
                                                        <div className="crit-meta">
                                                            <div className="crit-name">{crit}</div>
                                                            <div className="crit-desc">{desc.split('.')[0]}.</div>
                                                        </div>
                                                        <div className="crit-actions">
                                                            <div className="rating-row">
                                                                {[1,2,3,4,5].map(v => (
                                                                    <button key={v} className={review.ratings[key] === v ? 'active' : ''} style={review.ratings[key] === v ? { background: getScoreColor(v), borderColor: getScoreColor(v) } : {}} onClick={() => setReview(p => ({...p, ratings: {...p.ratings, [key]: v}}))}>{v}</button>
                                                                ))}
                                                                <button onClick={() => setReview(p => ({...p, ratings: {...p.ratings, [key]: 0}}))} style={review.ratings[key] === 0 ? { background: '#94a3b8', color: 'white' } : {}}>N/A</button>
                                                            </div>
                                                            <textarea placeholder="Anmerkungen..." value={review.comments[key] || ''} onChange={(e) => setReview(p => ({...p, comments: {...p.comments, [key]: e.target.value}}))} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )})}
                            <button className="btn-generate" onClick={triggerGenerateProcess} disabled={isLoading}>{isLoading ? '🔄 Analysiere...' : '🚀 Strategischen KI-Bericht generieren'}</button>
                            
                            {/* Lead Capture Modal */}
                            {showLeadModal && (
                                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                                    <motion.div 
                                        initial={{ scale: 0.9, opacity: 0 }} 
                                        animate={{ scale: 1, opacity: 1 }} 
                                        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative"
                                    >
                                        <button 
                                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
                                            onClick={() => setShowLeadModal(false)}
                                        >
                                            ✕
                                        </button>
                                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Ihre Kurzauswertung ist bereit!</h3>
                                        <p className="text-slate-600 mb-6 leading-relaxed">
                                            Wohin dürfen wir Ihnen das PDF sowie weiterführende Tipps und Informationen zur Vollversion senden?
                                        </p>
                                        <input 
                                            type="email" 
                                            placeholder="Ihre geschäftliche E-Mail" 
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 mb-4 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                                            value={leadEmail}
                                            onChange={(e) => setLeadEmail(e.target.value)}
                                        />
                                        <button 
                                            className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-3 rounded-xl transition-all"
                                            onClick={handleGenerate}
                                            disabled={!leadEmail.includes('@') || isLoading}
                                        >
                                            {isLoading ? 'Lade Bericht...' : 'Bericht jetzt zusenden'}
                                        </button>
                                    </motion.div>
                                </div>
                            )}
                        </motion.div>
                    )}
                    {activeTab === 'report' && (
                        <motion.div 
                            key="report"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="report-doc"
                        >
                            {review.report ? (
                                <div className="paper">
                                    <h1 style={{ color: branding.primaryColor, marginBottom: '0.5rem' }}>Strategiebericht</h1>
                                    <div className="report-meta" style={{ marginBottom: '2.5rem', color: '#64748b', fontSize: '1.1rem' }}>
                                        <strong>{review.museumInfo.name || "Museum / Einrichtung"}</strong> &nbsp;|&nbsp; {review.museumInfo.date}
                                    </div>
                                    <section className="editor-sec">
                                        <label style={{ fontWeight: 800, color: branding.primaryColor }}>Zusammenfassung</label>
                                        <div className="summary-text" style={{ marginTop: '1rem' }}>
                                            <Markdown>{review.report.summary}</Markdown>
                                        </div>
                                    </section>
                                    <section className="editor-sec" style={{ marginTop: '2.5rem' }}>
                                        <label style={{ fontWeight: 800, color: branding.primaryColor }}>Empfehlungen</label>
                                        <div className="audit-grid" style={{ marginTop: '1rem' }}>
                                            {review.report.recommendations.map((rec, i) => (
                                                <div key={i} className="audit-card" style={{ padding: '1.2rem' }}>
                                                    <h4 style={{ margin: '0 0 0.5rem 0', color: branding.primaryColor }}>{rec.area}</h4>
                                                    <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.9rem' }}>{rec.items.map((item, j) => <li key={j}>{item}</li>)}</ul>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                    <div className="swot-grid" style={{ marginTop: '2.5rem' }}>
                                        <div className="swot-box strength"><h4>STÄRKEN</h4><ul>{review.report.swot.strengths.map((s,i) => <li key={i}>{s}</li>)}</ul></div>
                                        <div className="swot-box weakness"><h4>SCHWÄCHEN</h4><ul>{review.report.swot.weaknesses.map((s,i) => <li key={i}>{s}</li>)}</ul></div>
                                        <div className="swot-box strength" style={{ background: '#eff6ff', color: '#1e40af' }}><h4>CHANCEN</h4><ul>{review.report.swot.opportunities.map((s,i) => <li key={i}>{s}</li>)}</ul></div>
                                        <div className="swot-box weakness" style={{ background: '#fffbeb', color: '#92400e' }}><h4>RISIKEN</h4><ul>{review.report.swot.threats.map((s,i) => <li key={i}>{s}</li>)}</ul></div>
                                    </div>
                                    <section className="editor-sec" style={{ marginTop: '2.5rem' }}>
                                        <label style={{ fontWeight: 800, color: branding.primaryColor }}>Beratungsangebote</label>
                                        <div className="audit-grid" style={{ marginTop: '1rem' }}>
                                            {review.report.consulting.map((srv, i) => (
                                                <div key={i} className="audit-card" style={{ padding: '1.2rem', borderLeft: `5px solid ${branding.primaryColor}` }}>
                                                    <h4 style={{ margin: '0 0 0.5rem 0' }}>{srv.area}</h4>
                                                    <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.9rem' }}>{srv.items.map((item, j) => <li key={j}>{item}</li>)}</ul>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            ) : <div className="empty-state">Bitte Audit abschließen und Bericht generieren.</div>}
                        </motion.div>
                    )}
                    {activeTab === 'history' && (
                        <motion.div 
                            key="history"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="history-grid"
                        >
                            {savedReviews.map(r => (
                                <div key={r.id} className="history-card">
                                    <h3>{r.museumInfo.name || "Audit"}</h3>
                                    <p>{r.museumInfo.date} | {r.museumInfo.reviewer}</p>
                                    <div className="history-actions"><button onClick={() => {setReview(r); setActiveTab('info');}} className="btn-load">Laden</button><button onClick={() => handleDeleteReview(r.id)} className="btn-delete">Löschen</button></div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Admin Login Modal */}
            {showLoginModal && (
                <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }} 
                        animate={{ scale: 1, opacity: 1 }} 
                        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative"
                    >
                        <button 
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 text-xl font-bold"
                            onClick={() => setShowLoginModal(false)}
                        >
                            ✕
                        </button>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">
                            {isRegistering ? 'Account erstellen' : 'Admin Login'}
                        </h3>
                        <p className="text-slate-600 mb-6 text-sm">
                            Schaltet die Vollversion frei. Nur für autorisierte Nutzer.
                        </p>

                        <form onSubmit={handleAuthAction} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">E-Mail Adresse</label>
                                <input 
                                    type="email" 
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Passwort</label>
                                <input 
                                    type="password" 
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {loginError && (
                                <div className="text-red-500 text-sm font-semibold p-2 bg-red-50 rounded-lg">
                                    {loginError}
                                </div>
                            )}

                            <button 
                                type="submit"
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl mt-2 transition-all"
                            >
                                {isRegistering ? 'Registrieren' : 'Einloggen'}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <button 
                                type="button"
                                className="text-sm text-sky-600 font-semibold hover:underline"
                                onClick={() => setIsRegistering(!isRegistering)}
                            >
                                {isRegistering ? 'Bereits einen Account? Hier einloggen' : 'Neuen Account anlegen (Berater)'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};


const RadarChart = ({ data }) => {
    const size = 520, center = size / 2, radius = 135; 
    const formatLabel = (label) => label.includes('/') ? label.split('/') : [label];
    const points = CATEGORIES.map((cat, i) => {
        const a = (i / CATEGORIES.length) * 2 * Math.PI - Math.PI / 2;
        const score = data[cat] || 0;
        const r = (score / 5) * radius;
        const lx = center + (radius + 60) * Math.cos(a), ly = center + (radius + 60) * Math.sin(a);
        const anchor = lx > center + 15 ? 'start' : lx < center - 15 ? 'end' : 'middle';
        return { x: center + r * Math.cos(a), y: center + r * Math.sin(a), lx, ly, label: cat, anchor, score };
    });
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: '100%', height: 'auto', overflow: 'visible' }}>
            {[1,2,3,4,5].map(l => (
                <polygon key={l} points={CATEGORIES.map((_, i) => {
                    const a = (i / CATEGORIES.length) * 2 * Math.PI - Math.PI / 2;
                    const r = (l / 5) * radius;
                    return `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`;
                }).join(' ')} fill="none" stroke="#cbd5e1" strokeWidth="1" />
            ))}
            {CATEGORIES.map((_, i) => {
                const a = (i / CATEGORIES.length) * 2 * Math.PI - Math.PI / 2;
                return <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(a)} y2={center + radius * Math.sin(a)} stroke="#cbd5e1" />;
            })}
            <polygon points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(0, 90, 156, 0.2)" stroke="#005A9C" strokeWidth="3" />
            {points.map((p, i) => (
                <g key={i}>
                    <circle cx={p.x} cy={p.y} r="4.5" fill="#005A9C" />
                    <text x={p.lx} y={p.ly} fontSize="12" fontWeight="700" textAnchor={p.anchor} fill="#1e293b">
                        {formatLabel(p.label).map((line, idx) => <tspan x={p.lx} dy={idx === 0 ? 0 : "1.2em"} key={idx}>{line}</tspan>)}
                        <tspan x={p.lx} dy="1.2em" fill="#005A9C">({p.score.toFixed(1)})</tspan>
                    </text>
                </g>
            ))}
        </svg>
    );
};

createRoot(document.getElementById('root')).render(<App />);
