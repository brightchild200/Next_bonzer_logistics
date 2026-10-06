'use client';

import { useState, useCallback } from 'react';
import { Clock, CheckCircle2, XCircle, MapPin, Loader2, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth-provider';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { toast } from 'sonner';

type AttendanceStatus = 'CHECKED_IN' | 'CHECKED_OUT' | 'ABSENT' | 'ON_LEAVE';

interface AttendanceRecord {
  id: string;
  salesperson_id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  working_minutes: number | null;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

interface CheckInInput {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface CheckInResult {
  success: boolean;
  attendance?: AttendanceRecord;
  error?: string;
}

interface CheckOutInput {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface CheckOutResult {
  success: boolean;
  attendance?: AttendanceRecord;
  error?: string;
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getStatusConfig(status: AttendanceStatus) {
  switch (status) {
    case 'CHECKED_IN':
      return { label: 'Checked In', color: 'bg-green/10 text-green border-green/20', icon: CheckCircle2 };
    case 'CHECKED_OUT':
      return { label: 'Checked Out', color: 'bg-blue/10 text-blue border-blue/20', icon: XCircle };
    case 'ON_LEAVE':
      return { label: 'On Leave', color: 'bg-amber/10 text-amber border-amber/20', icon: Info };
    default:
      return { label: 'Absent', color: 'bg-muted text-muted-foreground border-border', icon: Clock };
  }
}

export function AttendanceWidget() {
  const { can } = useAuth();
  const canCheckIn = can(PERMISSIONS.ATTENDANCE.CHECK_IN);
  const canCheckOut = can(PERMISSIONS.ATTENDANCE.CHECK_OUT);
  const canReadOwn = can(PERMISSIONS.ATTENDANCE.READ_OWN);

  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'checkin' | 'checkout' | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const fetchAttendance = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance/today');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAttendance(data.attendance);
        }
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!canCheckIn && !canCheckOut && !canReadOwn) {
    return null;
  }

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Location permission denied. Please enable location access to check in/out.'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Location information is unavailable. Please try again.'));
              break;
            case error.TIMEOUT:
              reject(new Error('Location request timed out. Please try again.'));
              break;
            default:
              reject(new Error('An unknown error occurred while getting location.'));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleCheckIn = async () => {
    setGpsError(null);
    setActionLoading('checkin');

    try {
      const position = await getCurrentPosition();
      const { latitude, longitude, accuracy } = position.coords;

      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, accuracy } as CheckInInput),
      });

      const data = await res.json() as CheckInResult;

      if (data.success) {
        toast.success('Checked in successfully');
        setAttendance(data.attendance ?? null);
        await fetchAttendance();
      } else {
        toast.error(data.error ?? 'Check-in failed');
        if (data.error?.includes('location') || data.error?.includes('GPS') || data.error?.includes('latitude') || data.error?.includes('longitude')) {
          setGpsError(data.error);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Check-in failed';
      toast.error(message);
      setGpsError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckOut = async () => {
    setGpsError(null);
    setActionLoading('checkout');

    try {
      const position = await getCurrentPosition();
      const { latitude, longitude, accuracy } = position.coords;

      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, accuracy } as CheckOutInput),
      });

      const data = await res.json() as CheckOutResult;

      if (data.success) {
        toast.success('Checked out successfully');
        setAttendance(data.attendance ?? null);
        await fetchAttendance();
      } else {
        toast.error(data.error ?? 'Check-out failed');
        if (data.error?.includes('location') || data.error?.includes('GPS') || data.error?.includes('latitude') || data.error?.includes('longitude')) {
          setGpsError(data.error);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Check-out failed';
      toast.error(message);
      setGpsError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const statusConfig = attendance ? getStatusConfig(attendance.status) : getStatusConfig('ABSENT');
  const StatusIcon = statusConfig.icon;

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-muted-foreground" /> Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isCheckedIn = attendance?.status === 'CHECKED_IN';
  const isCheckedOut = attendance?.status === 'CHECKED_OUT';

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-muted-foreground" /> Attendance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${statusConfig.color}`}>
              <StatusIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{statusConfig.label}</p>
              <p className="text-sm text-muted-foreground">
                {attendance?.attendance_date ? new Date(attendance.attendance_date).toLocaleDateString() : 'Today'}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className={`gap-1 ${statusConfig.color.replace('bg-', '').replace('text-', '').replace('border-', '')}`}>
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>

        {attendance && (
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Check In</p>
              <p className="font-mono text-lg font-semibold">
                {attendance.check_in_time ? new Date(attendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Check Out</p>
              <p className="font-mono text-lg font-semibold">
                {attendance.check_out_time ? new Date(attendance.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </p>
            </div>
            <div className="col-span-2 rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Working Time</p>
              <p className="font-display text-xl font-bold text-primary">{formatMinutes(attendance.working_minutes)}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {canCheckIn && !isCheckedIn && !isCheckedOut && (
            <Button
              onClick={handleCheckIn}
              disabled={actionLoading === 'checkin'}
              className="flex-1 min-w-[140px] gap-2 bg-green hover:bg-green/90"
            >
              {actionLoading === 'checkin' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Getting Location…
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4" />
                  Check In
                </>
              )}
            </Button>
          )}

          {canCheckOut && isCheckedIn && !isCheckedOut && (
            <Button
              onClick={handleCheckOut}
              disabled={actionLoading === 'checkout'}
              className="flex-1 min-w-[140px] gap-2 bg-blue hover:bg-blue/90"
            >
              {actionLoading === 'checkout' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Getting Location…
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4" />
                  Check Out
                </>
              )}
            </Button>
          )}

          {isCheckedOut && (
            <Badge variant="outline" className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 text-green border-green/30">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completed for today
            </Badge>
          )}

          {!attendance && !isCheckedIn && !isCheckedOut && (
            <Badge variant="outline" className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              No record for today
            </Badge>
          )}
        </div>

        {gpsError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}