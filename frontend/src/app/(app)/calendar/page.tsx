'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { EventApi } from '@fullcalendar/core/index.js';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid/index.js';
import timeGridPlugin from '@fullcalendar/timegrid/index.js';
import interactionPlugin from '@fullcalendar/interaction/index.js';

import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { EventDetailPanel } from './EventDetailPanel';
import { cn } from '@/lib/utils';
import { eventService, courseService, calendarService } from '@/lib/services';
import type { CalEvent, Course, GoogleSyncStatus } from '@/types';

type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

const LABEL_COLOR: Record<string, string> = { assignment: "#2563eb", exam: "#dc2626", lecture: "#16a34a" };

export default function CalendarPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const calendarRef = useRef<FullCalendar>(null);

    const [selectedEvent, setSelectedEvent] = useState<EventApi | null>(null);
    const [events, setEvents] = useState<CalEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState<CalendarView>('dayGridMonth');
    const [calendarTitle, setCalendarTitle] = useState('');
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(true);
    const [calendarError, setCalendarError] = useState<string | null>(null);

    // Google Sync State
    const [syncStatus, setSyncStatus] = useState<GoogleSyncStatus | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

    const courseId = searchParams.get('courseId');

    // Fetch Events & Sync info
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setLoading(true);
                const allEvents = await eventService.list();
                if (courseId && courseId !== 'all') {
                    setEvents(allEvents.filter(e => e.course_id === courseId));
                } else {
                    setEvents(allEvents);
                }
                setCalendarError(null);
            } catch (error) {
                console.error('Error fetching calendar events:', error);
                setCalendarError('Unable to load events right now. Please refresh the page.');
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
        calendarService.status().then(setSyncStatus).catch(() => { });

        // Detect redirect back from Google OAuth
        const params = new URLSearchParams(window.location.search);
        if (params.get("connected") === "1") {
            setSyncSuccess("Google Calendar connected successfully! Click Sync to sync.");
            calendarService.status().then(setSyncStatus).catch(() => { });
            window.history.replaceState({}, "", window.location.pathname);
        }
        if (params.get("error")) {
            setSyncError(`Connection failed: ${params.get("error")}`);
            window.history.replaceState({}, "", window.location.pathname);
        }
    }, [courseId]);

    // Fetch Courses
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setCoursesLoading(true);
                const data = await courseService.list();
                setCourses(data);
            } catch (error) {
                console.error('Error fetching courses:', error);
            } finally {
                setCoursesLoading(false);
            }
        };
        fetchCourses();
    }, []);

    const mappedEvents = useMemo(() => {
        return events.map(ev => {
            const course = courses.find(c => c.id === ev.course_id);
            return {
                id: ev.id,
                title: ev.title,
                start: ev.start_time,
                end: ev.end_time || ev.start_time,
                allDay: !ev.start_time?.includes('T'),
                backgroundColor: LABEL_COLOR[ev.label || 'lecture'] || "#3b82f6",
                extendedProps: {
                    type: ev.label === 'assignment' || ev.label === 'exam' ? ev.label : 'course',
                    courseName: course?.name,
                    description: ev.description,
                    courseStartDate: null,
                    courseEndDate: null,
                    indicatorColor: LABEL_COLOR[ev.label || 'lecture'] || "#3b82f6"
                }
            };
        });
    }, [events, courses]);

    const handleSync = async () => {
        setSyncError(null); setSyncSuccess(null);

        // If not connected → redirect to Google OAuth with JWT as state (via Vercel callback)
        if (!syncStatus?.connected) {
            const token = localStorage.getItem("access_token");
            const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
            const callbackUrl = `${window.location.origin}/auth/google/callback`;
            const scope = [
                "openid",
                "email",
                "profile",
                "https://www.googleapis.com/auth/calendar",
            ].join(" ");

            if (GOOGLE_CLIENT_ID) {
                // Production: build OAuth URL on frontend, callback goes to Vercel
                const params = new URLSearchParams({
                    client_id: GOOGLE_CLIENT_ID,
                    redirect_uri: callbackUrl,
                    response_type: "code",
                    scope,
                    access_type: "offline",
                    prompt: "consent",
                    ...(token ? { state: token } : {}),
                });
                window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
            } else {
                // Fallback: use backend login redirect (works locally)
                const redirectUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/google/login${token ? `?state=${encodeURIComponent(token)}` : ""}`;
                window.location.href = redirectUrl;
            }
            return;
        }


        setSyncing(true);
        try {
            const result = await calendarService.sync();
            setSyncSuccess(result.message || "Sync successfully!");
            const status = await calendarService.status();
            setSyncStatus(status);

            const allEvents = await eventService.list();
            if (courseId && courseId !== 'all') {
                setEvents(allEvents.filter(e => e.course_id === courseId));
            } else {
                setEvents(allEvents);
            }
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
                (err instanceof Error ? err.message : "Sync failed. Please try again.");
            setSyncError(typeof msg === "string" ? msg : "Sync failed");
        } finally {
            setSyncing(false);
        }
    };

    const syncTitle = useCallback((info?: { view: { title: string } }) => {
        if (info?.view?.title) {
            setCalendarTitle(info.view.title);
            return;
        }
        const api = calendarRef.current?.getApi();
        if (api) {
            setCalendarTitle(api.view.title);
        }
    }, []);

    const changeView = useCallback((view: CalendarView) => {
        setCurrentView(view);
        const api = calendarRef.current?.getApi();
        api?.changeView(view);
        syncTitle();
    }, [syncTitle]);

    const handleNavigate = useCallback((direction: 'prev' | 'next') => {
        const api = calendarRef.current?.getApi();
        if (direction === 'prev') {
            api?.prev();
        } else {
            api?.next();
        }
        syncTitle();
    }, [syncTitle]);

    const handleToday = useCallback(() => {
        const api = calendarRef.current?.getApi();
        api?.today();
        syncTitle();
    }, [syncTitle]);

    const handleEventClick = useCallback((clickInfo: any) => {
        setSelectedEvent(clickInfo.event);
        // On mobile: open dialog immediately instead of side panel
        if (window.innerWidth < 768) {
            setDetailDrawerOpen(true);
        }
    }, []);

    const handleEventDidMount = useCallback((info: any) => {
        info.el.style.backgroundColor = 'transparent';
        info.el.style.border = 'none';
        info.el.style.padding = '0';
        info.el.style.margin = '1px 0';
        const mainFrame = info.el.querySelector('.fc-event-main-frame');
        if (mainFrame) {
            (mainFrame as HTMLElement).style.width = '100%';
        }
    }, []);

    const handleDateSelect = useCallback((selectInfo: any) => {
        setSelectedEvent(null);
        const calendarApi = selectInfo.view.calendar;
        calendarApi.changeView('timeGridDay', selectInfo.startStr);
        setCurrentView('timeGridDay');
        syncTitle();
    }, [syncTitle]);

    const viewOptions: { label: string; value: CalendarView }[] = [
        { label: 'Month', value: 'dayGridMonth' },
        { label: 'Week', value: 'timeGridWeek' },
        { label: 'Day', value: 'timeGridDay' }
    ];

    const handleCourseChange = (value: string) => {
        if (value === 'all') {
            router.push('/calendar');
        } else {
            router.push(`/calendar?courseId=${value}`);
        }
    };

    return (
        <div className="p-3 sm:p-4 md:p-6 min-h-screen flex flex-col gap-3 bg-white w-full">
            <div className="mb-2">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full flex-shrink-0" />
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        Calendar
                    </h1>
                </div>
            </div>
            {syncError && (
                <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between gap-2">
                        <span className="truncate">{syncError}</span>
                        <button onClick={() => setSyncError(null)} className="flex-shrink-0 hover:opacity-70">✕</button>
                    </AlertDescription>
                </Alert>
            )}
            {syncSuccess && (
                <Alert className="py-2 border-green-200 bg-green-50 text-green-700 [&>svg]:text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between gap-2 text-green-700">
                        <span className="truncate">{syncSuccess}</span>
                        <button onClick={() => setSyncSuccess(null)} className="flex-shrink-0 hover:opacity-70">✕</button>
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex items-center justify-between gap-2 pb-2 sm:pb-3 border-b border-gray-200 flex-wrap">
                {/* Course filter */}
                <Select
                    value={courseId ?? 'all'}
                    onValueChange={handleCourseChange}
                >
                    <SelectTrigger className="w-44 sm:w-56 text-sm">
                        <SelectValue placeholder="Filter course" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All courses</SelectItem>
                        {courses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                                {course.name}
                            </SelectItem>
                        ))}
                        {!coursesLoading && courses.length === 0 && (
                            <SelectItem value="__empty" disabled>
                                No courses
                            </SelectItem>
                        )}
                    </SelectContent>
                </Select>

                {/* Sync button */}
                <div className="flex flex-col items-end gap-0.5">
                    <Button
                        size="sm"
                        variant={syncStatus?.connected ? 'default' : 'outline'}
                        onClick={handleSync}
                        disabled={syncing}
                        className={cn(
                            "gap-1.5 text-xs sm:text-sm whitespace-nowrap",
                            syncStatus?.connected && !syncing && "bg-blue-600 hover:bg-blue-700 text-white",
                            !syncStatus?.connected && !syncing && "border-gray-300 text-gray-700 hover:bg-gray-50"
                        )}
                    >
                        {syncing
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Syncing...</>
                            : syncStatus?.connected
                                ? <><CheckCircle2 className="w-3.5 h-3.5" />Sync Google Calendar</>
                                : <><CalendarIcon className="w-3.5 h-3.5" />Connect Google Calendar</>
                        }
                    </Button>
                    {syncStatus?.connected && syncStatus.last_synced_at && (
                        <span className="text-[10px] text-gray-400">
                            {new Date(syncStatus.last_synced_at).toLocaleString("vi-VN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                    )}
                </div>
            </div>


            <div className="flex flex-col gap-2 sm:gap-3 pb-2 sm:pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
                    <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                        <Button variant="ghost" size="sm" onClick={() => handleNavigate('prev')} className="h-7 sm:h-8 w-7 sm:w-8 p-0 text-gray-600 text-xs sm:text-sm">
                            ‹
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleToday} className="h-7 sm:h-8 px-2 sm:px-4 text-gray-900 font-medium border border-gray-200 rounded-full text-xs sm:text-sm">
                            Today
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleNavigate('next')} className="h-7 sm:h-8 w-7 sm:w-8 p-0 text-gray-600 text-xs sm:text-sm">
                            ›
                        </Button>
                        <span className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 ml-1 sm:ml-2 truncate">{calendarTitle || 'Calendar'}</span>
                    </div>


                    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-wrap justify-end">
                        <div className="flex items-center bg-gray-100 rounded-full p-0.5 sm:p-1 text-xs sm:text-sm">
                            {viewOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => changeView(option.value)}
                                    className={cn(
                                        "px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition-all",
                                        currentView === option.value
                                            ? "bg-white shadow text-gray-900"
                                            : "text-gray-500 hover:text-gray-900"
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {calendarError && (
                    <div className="w-full rounded-lg border border-red-200 bg-red-50 px-2 sm:px-3 py-2 text-xs sm:text-sm text-red-700">
                        {calendarError}
                    </div>
                )}
            </div>

            <div className="flex flex-1 gap-2 sm:gap-3 md:gap-6 flex-col md:flex-row" style={{ minHeight: '520px' }}>
                <Card className="p-2 sm:p-3 md:p-4 bg-white border border-gray-200 flex-1 min-w-0 shadow-sm relative overflow-hidden w-full min-h-[480px] sm:min-h-[560px]">
                    {loading && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                Loading events
                            </div>
                        </div>
                    )}
                    {!loading && events.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-500 gap-2 z-10 bg-white/90">
                            <CalendarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300" />
                            <p className="font-medium text-xs sm:text-base">
                                {courseId && courseId !== 'all' ? 'No events for this course yet' : 'No events scheduled'}
                            </p>
                            {courses.length > 0 && (
                                <p className="text-xs sm:text-sm">Try selecting another course or add new events.</p>
                            )}
                        </div>
                    )}
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        headerToolbar={false}
                        initialView={currentView}
                        height="100%"
                        editable={false}
                        selectable
                        selectMirror
                        dayMaxEvents={3}
                        dayMaxEventRows
                        nowIndicator
                        moreLinkContent={(args) => (
                            <span className="text-[11px] font-semibold text-indigo-600">
                                +{args.num} more
                            </span>
                        )}
                        moreLinkClassNames="fc-more-link-custom"
                        moreLinkClick={(args) => {
                            const api = calendarRef.current?.getApi();
                            api?.changeView('timeGridDay', args.date);
                            setCurrentView('timeGridDay');
                            syncTitle();
                        }}
                        eventClick={handleEventClick}
                        select={handleDateSelect}
                        eventDidMount={handleEventDidMount}
                        datesSet={syncTitle}
                        events={mappedEvents}
                        eventContent={(arg) => {
                            const { indicatorColor } = arg.event.extendedProps;
                            const dotColor =
                                indicatorColor ||
                                arg.event.backgroundColor ||
                                arg.backgroundColor ||
                                "#2563eb";

                            return (
                                <div className="flex items-center gap-2 text-[11px] leading-tight w-full">
                                    <span
                                        className="inline-flex h-2.5 w-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: dotColor }}
                                    />
                                    <span className="truncate font-semibold text-slate-800">
                                        {arg.event.title}
                                    </span>
                                </div>
                            );
                        }}
                    />
                </Card>
                {/* Detail panel — hidden on mobile, shown as sidebar on md+ */}
                <div className="hidden md:block w-[260px] lg:w-[280px] flex-shrink-0">
                    <EventDetailPanel
                        event={selectedEvent}
                        onExpand={() => setDetailDrawerOpen(true)}
                    />
                </div>
            </div>

            <Dialog open={detailDrawerOpen} onOpenChange={setDetailDrawerOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Event Details</DialogTitle>
                    </DialogHeader>
                    <EventDetailPanel event={selectedEvent} variant="expanded" />
                </DialogContent>
            </Dialog>
        </div>
    );
}
