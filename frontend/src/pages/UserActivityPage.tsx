import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import axios from '@/utils/axios';
import { ActivityLog } from '@/types';
import { formatDate } from '@/utils/formatters';
import '@/components/css/UserActivityPage.css';

export const UserActivityPage = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await axios.get('/auth/admin/activity');
      setActivities(response.data || []);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionTypeBadgeClass = (activityType: string) => {
    switch (activityType?.toLowerCase()) {
      case 'login':
      case 'logout':
        return 'activity-badge-login';
      case 'create':
        return 'activity-badge-create';
      case 'update':
        return 'activity-badge-update';
      case 'delete':
        return 'activity-badge-delete';
      case 'view':
        return 'activity-badge-view';
      case 'upload':
      case 'download':
        return 'activity-badge-upload';
      case 'query':
        return 'activity-badge-query';
      default:
        return 'activity-badge-default';
    }
  };

  return (
    <div className="activity-page-container">
      <div className="activity-header-section">
        <div className="activity-header-content">
          <Activity className="activity-header-icon" />
          <div>
            <h1 className="activity-main-title">User Activity Logs</h1>
            <p className="activity-subtitle">Complete audit trail of all user actions</p>
          </div>
        </div>
      </div>

      <Card className="activity-table-card">
        <CardContent className="activity-table-content">
          {loading ? (
            <div className="activity-loading">
              <p>Loading activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="activity-empty-state">
              <p className="activity-empty-text">No activity recorded yet</p>
            </div>
          ) : (
            <div className="activity-table-wrapper">
              <table className="activity-table">
                <thead className="activity-table-head">
                  <tr>
                    <th className="activity-th">User</th>
                    <th className="activity-th">Activity Type</th>
                    <th className="activity-th">Action</th>
                    <th className="activity-th">Resource</th>
                    <th className="activity-th">Details</th>
                    <th className="activity-th">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="activity-table-body">
                  {activities.map((activity) => (
                    <tr key={activity.id} className="activity-table-row">
                      <td className="activity-td">
                        <div className="activity-user-info">
                          <span className="activity-username">{activity.username || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="activity-td">
                        <span className={`activity-badge ${getActionTypeBadgeClass(activity.activity_type || '')}`}>
                          {activity.activity_type || 'unknown'}
                        </span>
                      </td>
                      <td className="activity-td">
                        <span className="activity-action-text">{activity.action || 'No description'}</span>
                      </td>
                      <td className="activity-td">
                        <div className="activity-resource-info">
                          {activity.resource_type && (
                            <>
                              <span className="activity-resource-type">{activity.resource_type}</span>
                              {activity.resource_id && (
                                <span className="activity-resource-id">#{activity.resource_id}</span>
                              )}
                            </>
                          )}
                          {!activity.resource_type && <span className="activity-resource-none">—</span>}
                        </div>
                      </td>
                      <td className="activity-td">
                        {activity.action_details && Object.keys(activity.action_details).length > 0 ? (
                          <div className="activity-details">
                            {Object.entries(activity.action_details).slice(0, 2).map(([key, value]) => (
                              <span key={key} className="activity-detail-item">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="activity-details-none">—</span>
                        )}
                      </td>
                      <td className="activity-td">
                        <span className="activity-timestamp">{formatDate(activity.created_at || activity.timestamp)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
