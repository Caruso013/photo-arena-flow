import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Clock, ChevronDown, ChevronUp, Download, Mail, ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';

export interface ActivityItem {
  id: string;
  type: 'sale' | 'purchase' | 'user' | 'payout' | 'application' | 'event' | 'photo';
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
  status?: 'success' | 'pending' | 'error';
  buyerId?: string;
  buyerEmail?: string;
  photoId?: string;
  photoUrl?: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  title?: string;
  emptyMessage?: string;
  maxItems?: number;
}

const typeColors = {
  sale: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  purchase: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  user: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  payout: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  application: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  event: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  photo: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

const typeLabels = {
  sale: 'Venda',
  purchase: 'Compra',
  user: 'Usuário',
  payout: 'Repasse',
  application: 'Candidatura',
  event: 'Evento',
  photo: 'Foto',
};

const RecentActivity = ({ 
  activities, 
  title = 'Atividade Recente', 
  emptyMessage = 'Nenhuma atividade recente',
  maxItems = 10 
}: RecentActivityProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const displayedActivities = activities.slice(0, maxItems);

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const downloadPhoto = (photoUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = photoUrl;
    link.target = '_blank';
    link.download = fileName;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download iniciado!');
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayedActivities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedActivities.map((activity) => {
              const hasDetails = activity.type === 'sale' && (activity.buyerEmail || activity.photoUrl);
              const isExpanded = expandedItems.has(activity.id);

              return (
                <Collapsible
                  key={activity.id}
                  open={isExpanded}
                  onOpenChange={() => hasDetails && toggleExpanded(activity.id)}
                >
                  <div className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className={`text-xs ${typeColors[activity.type]} shrink-0`}>
                        {typeLabels[activity.type]}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="font-medium text-sm text-foreground truncate">{activity.title}</p>
                          {hasDetails && (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                {isExpanded ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {activity.amount !== undefined && (
                          <p className="font-semibold text-sm text-green-600 dark:text-green-400">
                            R$ {activity.amount.toFixed(2)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    {/* Expanded content */}
                    <CollapsibleContent className="mt-3 pt-3 border-t space-y-2">
                      {activity.buyerEmail && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{activity.buyerEmail}</span>
                        </div>
                      )}
                      {activity.photoUrl && (
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={activity.photoUrl}
                              alt={activity.description}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium truncate">{activity.description}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadPhoto(
                                activity.photoUrl!, 
                                `foto_${activity.photoId?.slice(0, 8) || activity.id}.jpg`
                              );
                            }}
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                        </div>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
