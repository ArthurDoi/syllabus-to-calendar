'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Tag, BookOpen, Inbox, Clock, MapPin, ExternalLink } from 'lucide-react';
import { EventApi } from '@fullcalendar/core/index.js';
import { cn } from '@/lib/utils';

interface EventDetailPanelProps {
    event: EventApi | null;
    className?: string;
    variant?: 'compact' | 'expanded';
    onExpand?: () => void;
}

export function formatEventDate(event: EventApi): string {
    if (event.allDay) {
        return new Date(event.start || 0).toLocaleString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    }

    const startDate = new Date(event.start || 0);
    const endDate = event.end ? new Date(event.end) : null;

    if (endDate) {
        return `${startDate.toLocaleString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })} - ${endDate.toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        })}`;
    }

    return startDate.toLocaleString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}


function getEventTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        'course': 'Course',
        'assignment': 'Assignment',
        'exam': 'Exam',
        'class': 'Class',
        'milestone': 'Milestone'
    };
    return labels[type] || type;
}

function getEventTypeVariant(type: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
        'course': 'default',
        'assignment': 'secondary',
        'exam': 'destructive',
        'class': 'outline',
        'milestone': 'default'
    };
    return variants[type] || 'secondary';
}



export function EventDetailPanel({ event, className, variant = 'compact', onExpand }: EventDetailPanelProps) {
    if (!event) {
        return (
            <Card className={cn("h-full bg-white/70 border border-gray-200 shadow-sm", className)}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-gray-900">Details</CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                    <div className="flex flex-col items-center justify-center text-center text-gray-500 gap-3 h-full min-h-[260px]">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                            <Inbox className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800">No event selected</p>
                            <p className="text-sm">Select an event on the calendar to see its details.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }
    const { type, courseName, location, description, courseStartDate, courseEndDate } = event.extendedProps;
    const backgroundColor = event.backgroundColor || '#3b82f6';

    const isCompact = variant === 'compact';

    return (
        <Card className={cn("h-full bg-white/70 border border-gray-200 shadow-sm", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-semibold text-gray-900">Details</CardTitle>
                    {isCompact && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-gray-500 gap-1"
                            onClick={onExpand}
                        >
                            View full
                            <ExternalLink className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="grid gap-5">

                <div className="space-y-2">
                    <div className="flex items-start gap-2">
                        <div
                            className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                            style={{ backgroundColor }}
                        />
                        <h3 className="text-xl font-semibold leading-tight">{event.title}</h3>
                    </div>
                    {courseName && (
                        <p className="text-sm text-gray-500 ml-6 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 inline mr-1" />
                            {courseName}
                        </p>
                    )}
                </div>

                {/* Event details */}
                <div className="space-y-3 ml-6">
                    {type === 'course' && courseStartDate && courseEndDate ? (
                        <div className="flex items-start gap-3">
                            <Calendar className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium">Course duration</p>
                                <p className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium">Start date:</span> {new Date(courseStartDate).toLocaleDateString('en-US', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium">End date:</span> {new Date(courseEndDate).toLocaleDateString('en-US', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-3">
                            <Calendar className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium">
                                    {formatEventDate(event)}
                                </p>
                                {event.allDay && (
                                    <p className="text-xs text-gray-500 mt-1">All day</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <Tag className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        <Badge variant={getEventTypeVariant(type)}>
                            {getEventTypeLabel(type)}
                        </Badge>
                    </div>
                    {location && (
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm font-medium">{location}</p>
                        </div>
                    )}

                    {description && (
                        <div className="flex items-start gap-3">
                            <div className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm text-gray-600">{description}</p>
                        </div>
                    )}

                    {type === 'class' && (
                        <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium">Repeat weekly</p>
                                {event.start && event.end && (
                                    <p className="text-gray-500 text-xs mt-1">
                                        {event.start.toLocaleString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })} - {event.end.toLocaleString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

