'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { EventApi } from '@fullcalendar/core/index.js';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid/index.js';
import timeGridPlugin from '@fullcalendar/timegrid/index.js';
import interactionPlugin from '@fullcalendar/interaction/index.js';

import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
        calendarService.status().then(setSyncStatus).catch(() => {});

        // Detect redirect back from Google OAuth
        const params = new URLSearchParams(window.location.search);
        if (params.get("connected") === "1") {
          setSyncSuccess("Google Calendar đã được kết nối thành công! Bấm Sync để đồng bộ.");
          calendarService.status().then(setSyncStatus).catch(() => {});
          window.history.replaceState({}, "", window.location.pathname);
        }
        if (params.get("error")) {
          setSyncError(`Kết nối thất bại: ${params.get("error")}`);
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
    
        // If not connected → redirect to Google OAuth with JWT as state
        if (!syncStatus?.connected) {
          const token = localStorage.getItem("access_token");
          const redirectUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/google/login${token ? `?state=${encodeURIComponent(token)}` : ""}`;
          window.location.href = redirectUrl;
          return;
        }
    
        setSyncing(true);
        try {
          const result = await calendarService.sync();
          setSyncSuccess(result.message || "Sync thành công!");
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
            (err instanceof Error ? err.message : "Sync thất bại. Vui lòng thử lại.");
          setSyncError(typeof msg === "string" ? msg : "Sync thất bại");
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
        <div className="p-6 h-full flex flex-col gap-3 bg-white">
            {/* Sync notifications */}
            {syncError && (
              <div style={{ padding: "10px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#dc2626", display: "flex", justifyContent: "space-between" }}>
                <span>❌ {syncError}</span>
                <button onClick={() => setSyncError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}>✕</button>
              </div>
            )}
            {syncSuccess && (
              <div style={{ padding: "10px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 13, color: "#16a34a", display: "flex", justifyContent: "space-between" }}>
                <span>✅ {syncSuccess}</span>
                <button onClick={() => setSyncSuccess(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#16a34a" }}>✕</button>
              </div>
            )}


            <div className="flex flex-col items-end gap-1 pb-3 border-b border-gray-200">
                <Select
                    value={courseId ?? 'all'}
                    onValueChange={handleCourseChange}
                >
                    <SelectTrigger className="w-64">
                        <SelectValue placeholder="Filter by course" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">
                            All courses
                        </SelectItem>
                        {courses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                                {course.name}
                            </SelectItem>
                        ))}
                        {!coursesLoading && courses.length === 0 && (
                            <SelectItem value="__empty" disabled>
                                No courses found
                            </SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleNavigate('prev')} className="h-8 w-8 p-0 text-gray-600">
                        ‹
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleToday} className="h-8 px-4 text-gray-900 font-medium border border-gray-200 rounded-full">
                        Today
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleNavigate('next')} className="h-8 w-8 p-0 text-gray-600">
                        ›
                    </Button>
                    <span className="text-xl font-semibold text-gray-900 ml-2">{calendarTitle || 'Calendar'}</span>
                </div>
                

                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-gray-100 rounded-full p-1">
                      {viewOptions.map((option) => (
                          <button
                              key={option.value}
                              onClick={() => changeView(option.value)}
                              className={cn(
                                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                                  currentView === option.value
                                      ? "bg-white shadow text-gray-900"
                                      : "text-gray-500 hover:text-gray-900"
                              )}
                          >
                              {option.label}
                          </button>
                      ))}
                  </div>

                  {/* Google Calendar Connect/Sync button */}
                  <div className="flex flex-col items-end gap-1">
                    <button onClick={handleSync} disabled={syncing}
                      className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm", {
                        "bg-blue-600 text-white hover:bg-blue-700": syncStatus?.connected && !syncing,
                        "bg-gray-800 text-white hover:bg-gray-900": !syncStatus?.connected && !syncing,
                        "bg-gray-300 text-gray-600 cursor-not-allowed": syncing
                      })}>
                      {syncing ? "⟳ Syncing..." : syncStatus?.connected ? "🔄 Sync Google Calendar" : "🔗 Connect Google Calendar"}
                    </button>
                    {syncStatus?.connected && syncStatus.last_synced_at && (
                      <span className="text-[10px] text-gray-400">
                        Last sync: {new Date(syncStatus.last_synced_at).toLocaleString("vi-VN")}
                      </span>
                    )}
                  </div>
                </div>

                {calendarError && (
                    <div className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {calendarError}
                    </div>
                )}
            </div>

            <div className="flex flex-1 gap-6 min-h-0">
                <Card className="p-4 bg-white border border-gray-200 flex-1 min-w-0 shadow-sm relative overflow-hidden">
                    {loading && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading events
                            </div>
                        </div>
                    )}
                    {!loading && events.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-500 gap-2 z-10 bg-white/90">
                            <CalendarIcon className="w-8 h-8 text-gray-300" />
                            <p className="font-medium">
                                {courseId && courseId !== 'all' ? 'No events for this course yet' : 'No events scheduled'}
                            </p>
                            {courses.length > 0 && (
                                <p className="text-sm">Try selecting another course or add new events.</p>
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
                <div className="w-[260px] lg:w-[280px] flex-shrink-0">
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
