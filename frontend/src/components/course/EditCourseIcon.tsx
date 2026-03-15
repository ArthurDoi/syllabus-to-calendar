'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IconPicker } from './IconPicker';
import { COURSE_ICONS } from '@/constants/course-icons';
import { Loader2, Edit2, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface EditCourseIconProps {
  courseId: string;
  currentIcon: string;
  courseColor: string;
  onIconUpdate?: () => void;
}

export function EditCourseIcon({ courseId, currentIcon, courseColor, onIconUpdate }: EditCourseIconProps) {
  const [selectedIcon, setSelectedIcon] = useState(currentIcon || 'Calendar');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          icon: selectedIcon,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update icon');
      }

      setOpen(false);
      if (onIconUpdate) {
        onIconUpdate();
      }
      // Refresh the page to show updated icon
      window.location.reload();
    } catch (error) {
      console.error('Error updating icon:', error);
      alert('Failed to update icon. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Edit2 className="w-4 h-4" />
          Change Icon
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Course Icon</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <IconPicker
            selectedIcon={selectedIcon}
            onIconSelect={setSelectedIcon}
            courseColor={courseColor}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || selectedIcon === currentIcon}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

