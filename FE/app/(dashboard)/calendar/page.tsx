'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useRef, useState, useEffect } from 'react';
import { EventApi } from '@fullcalendar/core/index.js';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid/index.js';
import timeGridPlugin from '@fullcalendar/timegrid/index.js';
import interactionPlugin from '@fullcalendar/interaction/index.js';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar as CalendarIcon, Filter, Loader2 } from 'lucide-react';
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

type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
type CalendarCourse = {
    id: string;
    name: string;
    code?: string | null;
};

export default function CalendarPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const calendarRef = useRef<FullCalendar>(null);

    const [selectedEvent, setSelectedEvent] = useState<EventApi | null>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState<CalendarView>('dayGridMonth');
    const [calendarTitle, setCalendarTitle] = useState('');
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
    const [courses, setCourses] = useState<CalendarCourse[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(true);
    const [calendarError, setCalendarError] = useState<string | null>(null);
    const [coursesError, setCoursesError] = useState<string | null>(null);

    const courseId = searchParams.get('courseId');

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setLoading(true);
                const url = courseId
                    ? `/api/calendar-events?courseId=${courseId}`
                    : '/api/calendar-events';

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error('Failed to fetch events');
                }

                const data = await response.json();
                setEvents(data);
                setCalendarError(null);
            } catch (error) {
                console.error('Error fetching calendar events:', error);
                setCalendarError('Unable to load events right now. Please refresh the page.');
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, [courseId]);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setCoursesLoading(true);
                const response = await fetch('/api/courses');
                if (!response.ok) {
                    throw new Error('Failed to fetch courses');
                }
                const data = await response.json();
                setCourses(data?.courses || data || []);
                setCoursesError(null);
            } catch (error) {
                console.error('Error fetching courses:', error);
                setCoursesError('Unable to load courses');
            } finally {
                setCoursesLoading(false);
            }
        };
        fetchCourses();
    }, []);

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
                                {course.code ? `${course.code} — ${course.name}` : course.name}
                            </SelectItem>
                        ))}
                        {!coursesLoading && courses.length === 0 && (
                            <SelectItem value="__empty" disabled>
                                No courses found
                            </SelectItem>
                        )}
                    </SelectContent>
                </Select>
                {coursesError && (
                    <p className="text-xs text-red-500">{coursesError}</p>
                )}
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
                                {courseId ? 'No events for this course yet' : 'No events scheduled'}
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
                        events={events}
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
