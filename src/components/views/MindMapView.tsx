import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Panel,
  BackgroundVariant,
  Connection,
  NodeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Network, ArrowLeft, GitBranch, Share2, Link2, Unlink, List, Waypoints, Save } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { TaskNode } from '@/components/mindmap/TaskNode';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useGradientColors } from '@/hooks/useGradientColors';
import { CreateTaskForm } from '@/components/forms/CreateTaskForm';
import { TaskDetailView } from '@/components/tasks/TaskDetailView';
import { Icon3D } from '@/components/ui/icon-picker';
import { Task, Goal } from '@/types';
import { GoalDetailsModal } from '@/components/goals/GoalDetailsModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';


const nodeTypes = {
  task: TaskNode,
};

type ViewType = 'mindmap' | 'orgchart' | 'list';

interface ProjectItem {
  id: string;
  title: string;
  icon: string;
  color: string;
  childrenCount: number;
  type: 'task' | 'goal';
}

interface PendingConnection {
  sourceTaskId: string;
  targetTaskId: string;
  sourceTask: Task;
  targetTask: Task;
}

interface PendingDisconnection {
  childTask: Task;
  parentTask: Task;
}

export function MindMapView() {
  const { tasks, updateTask, goals, updateGoal } = useStore();
  const { contrastColor, color1: systemColor } = useGradientColors();
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [viewType, setViewType] = useState<ViewType>('mindmap');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [createTaskContext, setCreateTaskContext] = useState<{ parentId?: string } | null>(null);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [selectedGoalForDetail, setSelectedGoalForDetail] = useState<Goal | null>(null);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [pendingDisconnection, setPendingDisconnection] = useState<PendingDisconnection | null>(null);
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [hasPositionChanges, setHasPositionChanges] = useState(false);
  const savedPositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  // Toggle collapse state for a task
  const handleToggleCollapse = useCallback((taskId: string) => {
    setCollapsedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  // Handle connection between nodes
  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    
    // Extract task IDs from node IDs (format: "task-{id}")
    const sourceTaskId = connection.source.replace('task-', '');
    const targetTaskId = connection.target.replace('task-', '');
    
    const sourceTask = tasks.find(t => t.id === sourceTaskId);
    const targetTask = tasks.find(t => t.id === targetTaskId);
    
    if (!sourceTask || !targetTask) return;
    
    // Don't allow connecting a task to itself
    if (sourceTaskId === targetTaskId) return;
    
    // Don't allow if target is already a child of source
    if (targetTask.parentId === sourceTaskId) {
      toast.info('Esta tarefa já é uma subtarefa');
      return;
    }
    
    // Show confirmation dialog
    setPendingConnection({
      sourceTaskId,
      targetTaskId,
      sourceTask,
      targetTask,
    });
  }, [tasks]);

  // Confirm the parent-child relationship
  const handleConfirmConnection = useCallback(async () => {
    if (!pendingConnection) return;
    
    const { sourceTaskId, targetTaskId, targetTask } = pendingConnection;
    
    try {
      // Update the target task to have the source as its parent
      await updateTask(targetTaskId, {
        parentId: sourceTaskId,
        depth: (tasks.find(t => t.id === sourceTaskId)?.depth || 0) + 1,
      });
      
      toast.success(`"${targetTask.title}" agora é subtarefa`);
    } catch (error) {
      toast.error('Erro ao criar relação');
    }
    
    setPendingConnection(null);
  }, [pendingConnection, updateTask, tasks]);

  // Handle edge click to disconnect
  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    // Parse edge ID to find child task
    // Edge IDs follow pattern: "e-task-{parentId}-sub-{childId}" or "e-root-{parentId}-task-{childId}"
    const edgeId = edge.id;
    
    // Extract task IDs from edge
    let childTaskId: string | null = null;
    let parentTaskId: string | null = null;
    
    if (edgeId.includes('-sub-')) {
      // Pattern: e-task-{parentId}-sub-{childId}
      const match = edgeId.match(/e-task-(.+?)-sub-(.+)/);
      if (match) {
        parentTaskId = match[1];
        childTaskId = match[2];
      }
    } else if (edgeId.includes('-task-') && edgeId.includes('root-')) {
      // Pattern: e-root-{parentId}-task-{childId}
      const match = edgeId.match(/e-root-(.+?)-task-(.+)/);
      if (match) {
        parentTaskId = match[1];
        childTaskId = match[2];
      }
    }
    
    if (!childTaskId || !parentTaskId) return;
    
    const childTask = tasks.find(t => t.id === childTaskId);
    const parentTask = tasks.find(t => t.id === parentTaskId);
    
    if (!childTask || !parentTask) return;
    
    // Show confirmation dialog
    setPendingDisconnection({ childTask, parentTask });
  }, [tasks]);

  // Confirm disconnection
  const handleConfirmDisconnection = useCallback(async () => {
    if (!pendingDisconnection) return;
    
    const { childTask } = pendingDisconnection;
    
    try {
      await updateTask(childTask.id, {
        parentId: null,
        depth: 0,
      });
      
      toast.success(`"${childTask.title}" desvinculada`);
    } catch (error) {
      toast.error('Erro ao desvincular');
    }
    
    setPendingDisconnection(null);
  }, [pendingDisconnection, updateTask]);

  // Callback for viewing task or goal details
  const handleTaskClick = useCallback((itemId: string) => {
    // Check if it's a task first
    const task = tasks.find(t => t.id === itemId);
    if (task) {
      setSelectedTaskForDetail(task);
      return;
    }
    // Check if it's a goal
    const goal = goals.find(g => g.id === itemId);
    if (goal) {
      setSelectedGoalForDetail(goal);
    }
  }, [tasks, goals]);

  // Callback for toggling task completion
  const handleToggleComplete = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await updateTask(taskId, { 
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    });
  }, [tasks, updateTask]);

  // Callback for adding subtasks
  const handleAddSubtask = useCallback((parentId: string) => {
    setCreateTaskContext({ parentId });
    setShowCreateTask(true);
  }, []);

  // Get root tasks and project-type goals
  const projects = useMemo(() => {
    const items: ProjectItem[] = [];

    // Get root tasks (milestones/tasks at depth 0)
    const rootTasks = tasks.filter(t => !t.parentId && t.depth === 0);
    rootTasks.forEach(task => {
      const children = tasks.filter(t => t.parentId === task.id);
      items.push({
        id: task.id,
        title: task.title,
        icon: task.icon || '📋',
        color: (task as any).color || systemColor,
        childrenCount: children.length,
        type: 'task',
      });
    });

    // Get project-type goals that can have children/submetas
    const projectGoals = goals.filter(g => g.goalType === 'project' && !g.parentId);
    projectGoals.forEach(goal => {
      const childGoals = goals.filter(g => g.parentId === goal.id);
      const linkedTasks = tasks.filter(t => t.linkedGoalId === goal.id);
      items.push({
        id: goal.id,
        title: goal.title,
        icon: goal.icon || '🎯',
        color: goal.color || systemColor,
        childrenCount: childGoals.length + linkedTasks.length,
        type: 'goal',
      });
    });

    return items;
  }, [tasks, goals, systemColor]);

  // Build nodes and edges for selected project
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!selectedProject) return { initialNodes: [], initialEdges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Helper to check if a task has children
    const taskHasChildren = (taskId: string) => tasks.some(t => t.parentId === taskId);
    // Helper to check if a goal has children (sub-goals or linked tasks)
    const goalHasChildren = (goalId: string) => 
      goals.some(g => g.parentId === goalId) || tasks.some(t => t.linkedGoalId === goalId);

    const centerX = 400;
    const centerY = 300;

    // Light gray edge style for all connections
    const edgeStyle = { 
      stroke: 'hsl(var(--muted-foreground) / 0.4)', 
      strokeWidth: 1.5,
    };
    const edgeStyleDashed = { ...edgeStyle, strokeDasharray: '4,4' };

    // Handle based on project type
    if (selectedProject.type === 'goal') {
      const rootGoal = goals.find(g => g.id === selectedProject.id);
      if (!rootGoal) return { initialNodes: [], initialEdges: [] };

      const childGoals = goals.filter(g => g.parentId === rootGoal.id);
      const linkedTasks = tasks.filter(t => t.linkedGoalId === rootGoal.id);
      const allChildren = [...childGoals.map(g => ({ ...g, isGoal: true })), ...linkedTasks.map(t => ({ ...t, isGoal: false }))];

      const rootHasChildren = allChildren.length > 0;
      const rootIsCollapsed = collapsedTasks.has(rootGoal.id);

      // Add root goal node (using task node format)
      nodes.push({
        id: `task-${rootGoal.id}`,
        type: 'task',
        position: { x: centerX - 80, y: centerY - 40 },
        data: { 
          task: { 
            id: rootGoal.id,
            title: rootGoal.title,
            icon: rootGoal.icon,
            color: rootGoal.color,
            status: rootGoal.status === 'achieved' ? 'completed' : rootGoal.status === 'in_progress' ? 'in_progress' : 'pending',
            progress: rootGoal.progress,
          } as any,
          isGoal: true,
          hasChildren: rootHasChildren,
          isCollapsed: rootIsCollapsed,
          onTaskClick: handleTaskClick,
          onToggleCollapse: handleToggleCollapse,
        },
      });

      if (rootIsCollapsed) {
        return { initialNodes: nodes, initialEdges: [] };
      }

      if (viewType === 'mindmap') {
        const radius = 280;
        const nodeWidth = 160;
        const nodeHeight = 80;
        
        allChildren.forEach((child, i) => {
          const angle = (i / Math.max(allChildren.length, 1)) * 2 * Math.PI - Math.PI / 2;
          const x = centerX + Math.cos(angle) * radius - nodeWidth / 2;
          const y = centerY + Math.sin(angle) * radius - nodeHeight / 2;

          const itemHasChildren = (child as any).isGoal 
            ? goalHasChildren(child.id) 
            : taskHasChildren(child.id);
          const itemIsCollapsed = collapsedTasks.has(child.id);

          nodes.push({
            id: `task-${child.id}`,
            type: 'task',
            position: { x, y },
            data: { 
              task: (child as any).isGoal ? {
                id: child.id,
                title: (child as Goal).title,
                icon: (child as Goal).icon,
                color: (child as Goal).color,
                status: (child as Goal).status === 'achieved' ? 'completed' : (child as Goal).status === 'in_progress' ? 'in_progress' : 'pending',
                progress: (child as Goal).progress,
              } as any : { ...child },
              isSubtask: true, 
              isGoal: (child as any).isGoal,
              hasChildren: itemHasChildren,
              isCollapsed: itemIsCollapsed,
              onAddSubtask: !(child as any).isGoal ? handleAddSubtask : undefined,
              onTaskClick: handleTaskClick,
              onToggleCollapse: handleToggleCollapse,
              onToggleComplete: !(child as any).isGoal ? handleToggleComplete : undefined,
            },
          });

          edges.push({
            id: `e-root-${rootGoal.id}-task-${child.id}`,
            source: `task-${rootGoal.id}`,
            target: `task-${child.id}`,
            type: 'smoothstep',
            animated: (child as any).isGoal 
              ? (child as Goal).status === 'in_progress' 
              : (child as Task).status === 'in_progress',
            style: edgeStyle,
          });
        });
      } else if (viewType === 'orgchart') {
        const nodeGapX = 220;
        const levelGapY = 160;
        const startY = 50;

        nodes[0].position = { x: 100 + (allChildren.length * nodeGapX) / 2 - 80, y: startY };

        allChildren.forEach((child, i) => {
          const x = 100 + i * nodeGapX;
          const y = startY + levelGapY;

          const itemHasChildren = (child as any).isGoal 
            ? goalHasChildren(child.id) 
            : taskHasChildren(child.id);
          const itemIsCollapsed = collapsedTasks.has(child.id);

          nodes.push({
            id: `task-${child.id}`,
            type: 'task',
            position: { x, y },
            data: { 
              task: (child as any).isGoal ? {
                id: child.id,
                title: (child as Goal).title,
                icon: (child as Goal).icon,
                color: (child as Goal).color,
                status: (child as Goal).status === 'achieved' ? 'completed' : (child as Goal).status === 'in_progress' ? 'in_progress' : 'pending',
                progress: (child as Goal).progress,
              } as any : { ...child },
              isSubtask: true, 
              isGoal: (child as any).isGoal,
              hasChildren: itemHasChildren,
              isCollapsed: itemIsCollapsed,
              onAddSubtask: !(child as any).isGoal ? handleAddSubtask : undefined,
              onTaskClick: handleTaskClick,
              onToggleCollapse: handleToggleCollapse,
              onToggleComplete: !(child as any).isGoal ? handleToggleComplete : undefined,
            },
          });

          edges.push({
            id: `e-root-${rootGoal.id}-task-${child.id}`,
            source: `task-${rootGoal.id}`,
            target: `task-${child.id}`,
            type: 'smoothstep',
            animated: (child as any).isGoal 
              ? (child as Goal).status === 'in_progress' 
              : (child as Task).status === 'in_progress',
            style: edgeStyle,
          });
        });
      } else {
        // List view
        const nodeGapY = 90;
        const startX = 200;
        const startY = 20;

        nodes[0].position = { x: startX, y: startY };
        
        let currentY = startY + nodeGapY;

        allChildren.forEach((child) => {
          const x = startX;
          const y = currentY;

          const itemHasChildren = (child as any).isGoal 
            ? goalHasChildren(child.id) 
            : taskHasChildren(child.id);
          const itemIsCollapsed = collapsedTasks.has(child.id);

          nodes.push({
            id: `task-${child.id}`,
            type: 'task',
            position: { x, y },
            data: { 
              task: (child as any).isGoal ? {
                id: child.id,
                title: (child as Goal).title,
                icon: (child as Goal).icon,
                color: (child as Goal).color,
                status: (child as Goal).status === 'achieved' ? 'completed' : (child as Goal).status === 'in_progress' ? 'in_progress' : 'pending',
                progress: (child as Goal).progress,
              } as any : { ...child },
              isSubtask: true, 
              isGoal: (child as any).isGoal,
              hasChildren: itemHasChildren,
              isCollapsed: itemIsCollapsed,
              onAddSubtask: !(child as any).isGoal ? handleAddSubtask : undefined,
              onTaskClick: handleTaskClick,
              onToggleCollapse: handleToggleCollapse,
              onToggleComplete: !(child as any).isGoal ? handleToggleComplete : undefined,
            },
          });

          edges.push({
            id: `e-root-${rootGoal.id}-task-${child.id}`,
            source: `task-${rootGoal.id}`,
            target: `task-${child.id}`,
            type: 'smoothstep',
            animated: (child as any).isGoal 
              ? (child as Goal).status === 'in_progress' 
              : (child as Task).status === 'in_progress',
            style: edgeStyle,
          });

          currentY += nodeGapY;
        });
      }

      return { initialNodes: nodes, initialEdges: edges };
    }

    // Original task-based logic
    const rootTask = tasks.find(t => t.id === selectedProject.id);
    if (!rootTask) return { initialNodes: [], initialEdges: [] };

    const childTasks = tasks.filter(t => t.parentId === rootTask.id);

    // Check if root task has children
    const rootHasChildren = childTasks.length > 0;
    const rootIsCollapsed = collapsedTasks.has(rootTask.id);

    // Add root task node
    nodes.push({
      id: `task-${rootTask.id}`,
      type: 'task',
      position: { x: centerX - 80, y: centerY - 40 },
      data: { 
        task: { ...rootTask }, 
        hasChildren: rootHasChildren,
        isCollapsed: rootIsCollapsed,
        onAddSubtask: handleAddSubtask, 
        onTaskClick: handleTaskClick,
        onToggleCollapse: handleToggleCollapse,
        onToggleComplete: handleToggleComplete,
      },
    });

    // If root is collapsed, don't show any children
    if (rootIsCollapsed) {
      return { initialNodes: nodes, initialEdges: [] };
    }

    if (viewType === 'mindmap') {
      const radius = 280;
      const nodeWidth = 160;
      const nodeHeight = 80;
      
      childTasks.forEach((task, i) => {
        const angle = (i / Math.max(childTasks.length, 1)) * 2 * Math.PI - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius - nodeWidth / 2;
        const y = centerY + Math.sin(angle) * radius - nodeHeight / 2;

        const itemHasChildren = taskHasChildren(task.id);
        const taskIsCollapsed = collapsedTasks.has(task.id);

        nodes.push({
          id: `task-${task.id}`,
          type: 'task',
          position: { x, y },
          data: { 
            task: { ...task }, 
            isSubtask: true, 
            hasChildren: itemHasChildren,
            isCollapsed: taskIsCollapsed,
            onAddSubtask: handleAddSubtask, 
            onTaskClick: handleTaskClick,
            onToggleCollapse: handleToggleCollapse,
            onToggleComplete: handleToggleComplete,
          },
        });

        edges.push({
          id: `e-root-${rootTask.id}-task-${task.id}`,
          source: `task-${rootTask.id}`,
          target: `task-${task.id}`,
          type: 'smoothstep',
          animated: task.status === 'in_progress',
          style: edgeStyle,
        });

        // Sub-subtasks - only show if parent is not collapsed
        if (!taskIsCollapsed) {
          const subSubtasks = tasks.filter(t => t.parentId === task.id);
          const subRadius = 140;
          const arcSpread = Math.PI * 0.6;
          
          subSubtasks.forEach((sub, j) => {
            const totalSubs = subSubtasks.length;
            const startAngle = angle - arcSpread / 2;
            const subAngle = totalSubs > 1 
              ? startAngle + (j / (totalSubs - 1)) * arcSpread 
              : angle;
            
            const subX = x + nodeWidth / 2 + Math.cos(subAngle) * subRadius - 70;
            const subY = y + nodeHeight / 2 + Math.sin(subAngle) * subRadius - 30;

            const subHasChildren = taskHasChildren(sub.id);
            const subIsCollapsed = collapsedTasks.has(sub.id);

            nodes.push({
              id: `task-${sub.id}`,
              type: 'task',
              position: { x: subX, y: subY },
              data: { 
                task: { ...sub }, 
                isSubtask: true, 
                hasChildren: subHasChildren,
                isCollapsed: subIsCollapsed,
                onAddSubtask: handleAddSubtask, 
                onTaskClick: handleTaskClick,
                onToggleCollapse: handleToggleCollapse,
                onToggleComplete: handleToggleComplete,
              },
            });

            edges.push({
              id: `e-task-${task.id}-sub-${sub.id}`,
              source: `task-${task.id}`,
              target: `task-${sub.id}`,
              type: 'smoothstep',
              style: edgeStyleDashed,
            });
          });
        }
      });
    } else if (viewType === 'orgchart') {
      const nodeGapX = 220;
      const levelGapY = 160;
      const startY = 50;
      const subNodeGapX = 180;

      // Reposition root
      nodes[0].position = { x: 100 + (childTasks.length * nodeGapX) / 2 - 80, y: startY };

      childTasks.forEach((task, i) => {
        const x = 100 + i * nodeGapX;
        const y = startY + levelGapY;

        const itemHasChildren2 = taskHasChildren(task.id);
        const taskIsCollapsed = collapsedTasks.has(task.id);

        nodes.push({
          id: `task-${task.id}`,
          type: 'task',
          position: { x, y },
          data: { 
            task: { ...task }, 
            isSubtask: true, 
            hasChildren: itemHasChildren2,
            isCollapsed: taskIsCollapsed,
            onAddSubtask: handleAddSubtask, 
            onTaskClick: handleTaskClick,
            onToggleCollapse: handleToggleCollapse,
            onToggleComplete: handleToggleComplete,
          },
        });

        edges.push({
          id: `e-root-${rootTask.id}-task-${task.id}`,
          source: `task-${rootTask.id}`,
          target: `task-${task.id}`,
          type: 'smoothstep',
          animated: task.status === 'in_progress',
          style: edgeStyle,
        });

        // Sub-subtasks - only show if parent is not collapsed
        if (!taskIsCollapsed) {
          const subSubtasks = tasks.filter(t => t.parentId === task.id);
          const totalWidth = (subSubtasks.length - 1) * subNodeGapX;
          const startX = x - totalWidth / 2;
          
          subSubtasks.forEach((sub, j) => {
            const subX = startX + j * subNodeGapX;
            const subY = y + levelGapY;

            const subHasChildren = taskHasChildren(sub.id);
            const subIsCollapsed = collapsedTasks.has(sub.id);

            nodes.push({
              id: `task-${sub.id}`,
              type: 'task',
              position: { x: subX, y: subY },
              data: { 
                task: { ...sub }, 
                isSubtask: true, 
                hasChildren: subHasChildren,
                isCollapsed: subIsCollapsed,
                onAddSubtask: handleAddSubtask, 
                onTaskClick: handleTaskClick,
                onToggleCollapse: handleToggleCollapse,
                onToggleComplete: handleToggleComplete,
              },
            });

            edges.push({
              id: `e-task-${task.id}-sub-${sub.id}`,
              source: `task-${task.id}`,
              target: `task-${sub.id}`,
              type: 'smoothstep',
              style: edgeStyleDashed,
            });
          });
        }
      });
    } else {
      // List layout - vertical list with indented subtasks
      const nodeGapY = 90;
      const startX = 200;
      const startY = 20;
      const indentX = 180;

      // Reposition root at top
      nodes[0].position = { x: startX, y: startY };
      
      let currentY = startY + nodeGapY;

      childTasks.forEach((task) => {
        const x = startX;
        const y = currentY;

        const itemHasChildren3 = taskHasChildren(task.id);
        const taskIsCollapsed = collapsedTasks.has(task.id);

        nodes.push({
          id: `task-${task.id}`,
          type: 'task',
          position: { x, y },
          data: { 
            task: { ...task }, 
            isSubtask: true, 
            hasChildren: itemHasChildren3,
            isCollapsed: taskIsCollapsed,
            onAddSubtask: handleAddSubtask, 
            onTaskClick: handleTaskClick,
            onToggleCollapse: handleToggleCollapse,
            onToggleComplete: handleToggleComplete,
          },
        });

        edges.push({
          id: `e-root-${rootTask.id}-task-${task.id}`,
          source: `task-${rootTask.id}`,
          target: `task-${task.id}`,
          type: 'smoothstep',
          animated: task.status === 'in_progress',
          style: edgeStyle,
        });

        currentY += nodeGapY;

        // Sub-subtasks - only show if parent is not collapsed
        if (!taskIsCollapsed) {
          const subSubtasks = tasks.filter(t => t.parentId === task.id);
          
          subSubtasks.forEach((sub) => {
            const subX = x + indentX;
            const subY = currentY;

            const subHasChildren = taskHasChildren(sub.id);
            const subIsCollapsed = collapsedTasks.has(sub.id);

            nodes.push({
              id: `task-${sub.id}`,
              type: 'task',
              position: { x: subX, y: subY },
              data: { 
                task: { ...sub }, 
                isSubtask: true, 
                hasChildren: subHasChildren,
                isCollapsed: subIsCollapsed,
                onAddSubtask: handleAddSubtask, 
                onTaskClick: handleTaskClick,
                onToggleCollapse: handleToggleCollapse,
                onToggleComplete: handleToggleComplete,
              },
            });

            edges.push({
              id: `e-task-${task.id}-sub-${sub.id}`,
              source: `task-${task.id}`,
              target: `task-${sub.id}`,
              type: 'smoothstep',
              style: edgeStyleDashed,
            });

            currentY += nodeGapY;
          });
        }
      });
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [selectedProject, tasks, goals, viewType, collapsedTasks, handleAddSubtask, handleTaskClick, handleToggleCollapse, handleToggleComplete]);

  const [nodes, setNodes, onNodesChangeBase] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Custom handler to track position changes
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChangeBase(changes);
    
    // Check if any position changes occurred
    const hasPositionChange = changes.some(
      (change) => change.type === 'position' && change.dragging === false
    );
    
    if (hasPositionChange) {
      setHasPositionChanges(true);
    }
  }, [onNodesChangeBase]);

  // Save current positions
  const handleSavePositions = useCallback(() => {
    // Store positions in localStorage for this project
    if (selectedProject) {
      const positions: Record<string, { x: number; y: number }> = {};
      nodes.forEach(node => {
        positions[node.id] = { x: node.position.x, y: node.position.y };
      });
      localStorage.setItem(`mindmap-positions-${selectedProject.id}`, JSON.stringify(positions));
      setHasPositionChanges(false);
      toast.success('Posições salvas!');
    }
  }, [nodes, selectedProject]);

  // Reset positions changed when project changes
  useEffect(() => {
    setHasPositionChanges(false);
  }, [selectedProject?.id]);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const viewOptions = [
    { id: 'mindmap' as ViewType, label: 'Mapa mental', icon: Waypoints, description: 'Visualização radial' },
    { id: 'orgchart' as ViewType, label: 'Organograma', icon: GitBranch, description: 'Árvore hierárquica' },
    { id: 'list' as ViewType, label: 'Lista', icon: List, description: 'Lista vertical' },
  ];

  const activeTextColor = contrastColor === 'white' ? 'text-white' : 'text-black';

  // Filter state for project selection
  const [searchQuery, setSearchQuery] = useState('');
  const [filterHasChildren, setFilterHasChildren] = useState<'all' | 'with' | 'without'>('all');

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // Search filter
      if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Children filter
      if (filterHasChildren === 'with' && p.childrenCount === 0) return false;
      if (filterHasChildren === 'without' && p.childrenCount > 0) return false;
      return true;
    });
  }, [projects, searchQuery, filterHasChildren]);

  // Project selection view
  if (!selectedProject) {
    return (
      <div className="space-y-4 pt-safe lg:pt-0">
        {/* Header */}
        <div className="pt-4 lg:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-foreground">
            Mapa Mental
          </h1>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-32 sm:w-40 pl-3 pr-3 text-sm rounded-lg bg-muted/50 border border-border focus:border-primary focus:outline-none"
              />
            </div>
            {/* Filter */}
            <select
              value={filterHasChildren}
              onChange={(e) => setFilterHasChildren(e.target.value as 'all' | 'with' | 'without')}
              className="h-8 px-2 text-sm rounded-lg bg-muted/50 border border-border focus:border-primary focus:outline-none"
            >
              <option value="all">Todas</option>
              <option value="with">Com subtarefas</option>
              <option value="without">Sem subtarefas</option>
            </select>
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Network className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {projects.length === 0 ? 'Nenhum item encontrado' : 'Nenhum resultado'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {projects.length === 0 
                ? 'Crie tarefas raiz ou projetos para visualizá-los no mapa mental'
                : 'Tente ajustar os filtros de busca'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProjects.map((project) => (
              <motion.button
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className="p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all text-center"
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${project.color}20` }}
                  >
                    <Icon3D icon={project.icon} size="lg" fallback={project.type === 'goal' ? '🎯' : '📋'} />
                  </div>
                  <div className="w-full">
                    <h3 className="font-medium text-foreground text-sm truncate">
                      {project.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {project.childrenCount} {project.type === 'goal' ? 'subitens' : 'subtarefas'}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Mind Map view
  return (
    <div className="space-y-4 h-[calc(100vh-120px)] lg:h-[calc(100vh-48px)] pt-safe lg:pt-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 lg:pt-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedProject(null)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${selectedProject.color}20` }}
            >
              <Icon3D icon={selectedProject.icon} size="md" fallback={selectedProject.type === 'goal' ? '🎯' : '📋'} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground line-clamp-1">
                {selectedProject.title}
              </h1>
              <p className="text-xs text-muted-foreground">
                {selectedProject.childrenCount} {selectedProject.type === 'goal' ? 'subitens' : 'subtarefas'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 backdrop-blur-sm">
            {viewOptions.map((option) => {
              const Icon = option.icon;
              const isActive = viewType === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setViewType(option.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive ? activeTextColor : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeViewType"
                      className="absolute inset-0 rounded-lg gradient-bg"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon className={cn("h-4 w-4 relative z-10", isActive && activeTextColor)} />
                  <span className="relative z-10 hidden sm:inline">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mind Map Container */}
      <div className="flex-1 h-[calc(100%-80px)] rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden relative">
        {/* Save Button - appears when positions changed */}
        <AnimatePresence>
          {hasPositionChanges && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-10"
            >
              <Button
                onClick={handleSavePositions}
                className="gradient-bg shadow-lg gap-2"
              >
                <Save className={cn("h-4 w-4", activeTextColor)} />
                <span className={activeTextColor}>Salvar alterações</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onEdgeClick={handleEdgeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.1}
          maxZoom={2}
          attributionPosition="bottom-left"
          connectionLineStyle={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
          defaultEdgeOptions={{ 
            type: 'smoothstep',
            interactionWidth: 20,
          }}
          className="[&_.react-flow__edge:hover_.react-flow__edge-path]:!stroke-destructive/60 [&_.react-flow__edge:hover_.react-flow__edge-path]:!stroke-[3px] [&_.react-flow__edge]:cursor-pointer"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="hsl(var(--muted-foreground) / 0.2)"
          />
          <Controls
            showInteractive={false}
            className="!bg-card !border-border !shadow-lg"
          />

          {/* Stats Panel */}
          <Panel position="top-right" className="!m-3">
            <div className="bg-card/90 backdrop-blur-sm rounded-lg border border-border p-3 shadow-lg">
              <div className="text-xs text-muted-foreground mb-1">
                Visualização: <span className="text-foreground font-medium">
                  {viewOptions.find(v => v.id === viewType)?.label}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {viewOptions.find(v => v.id === viewType)?.description}
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Create Task Form */}
      <CreateTaskForm
        open={showCreateTask}
        onOpenChange={(open) => {
          setShowCreateTask(open);
          if (!open) setCreateTaskContext(null);
        }}
        parentTaskId={createTaskContext?.parentId}
        onSuccess={() => {
          setShowCreateTask(false);
          setCreateTaskContext(null);
        }}
      />

      {/* Task Detail View */}
      {selectedTaskForDetail && (
        <TaskDetailView
          task={selectedTaskForDetail}
          open={!!selectedTaskForDetail}
          onOpenChange={(open) => {
            if (!open) setSelectedTaskForDetail(null);
          }}
        />
      )}

      {/* Goal Detail View */}
      <GoalDetailsModal
        goalId={selectedGoalForDetail?.id || null}
        open={!!selectedGoalForDetail}
        onOpenChange={(open) => {
          if (!open) setSelectedGoalForDetail(null);
        }}
      />

      {/* Connection Confirmation Dialog */}
      <AlertDialog open={!!pendingConnection} onOpenChange={(open) => !open && setPendingConnection(null)}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Criar relação pai-filho?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Deseja tornar uma tarefa subtarefa da outra?
                </p>
                {pendingConnection && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Icon3D icon={pendingConnection.sourceTask.icon} size="sm" fallback="📋" />
                        <span className="font-medium text-foreground text-sm truncate max-w-[120px]">
                          {pendingConnection.sourceTask.title}
                        </span>
                      </div>
                      <span className="text-xs text-primary font-medium">Pai</span>
                    </div>
                    <div className="text-muted-foreground">→</div>
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Icon3D icon={pendingConnection.targetTask.icon} size="sm" fallback="📋" />
                        <span className="font-medium text-foreground text-sm truncate max-w-[120px]">
                          {pendingConnection.targetTask.title}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">Subtarefa</span>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmConnection} className="gradient-bg">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disconnection Confirmation Dialog */}
      <AlertDialog open={!!pendingDisconnection} onOpenChange={(open) => !open && setPendingDisconnection(null)}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Unlink className="h-5 w-5 text-destructive" />
              Desvincular subtarefa?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Esta ação removerá a relação pai-filho entre as tarefas.
                </p>
                {pendingDisconnection && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Icon3D icon={pendingDisconnection.parentTask.icon} size="sm" fallback="📋" />
                        <span className="font-medium text-foreground text-sm truncate max-w-[120px]">
                          {pendingDisconnection.parentTask.title}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">Pai</span>
                    </div>
                    <div className="text-destructive">✕</div>
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Icon3D icon={pendingDisconnection.childTask.icon} size="sm" fallback="📋" />
                        <span className="font-medium text-foreground text-sm truncate max-w-[120px]">
                          {pendingDisconnection.childTask.title}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">Subtarefa</span>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDisconnection} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
