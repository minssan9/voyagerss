import { Request, Response } from 'express';
import { TeamService } from '../services/TeamService';
import { AuthRequest } from '../middleware/authMiddleware';

export class TeamController {
    private teamService: TeamService;

    constructor() {
        this.teamService = new TeamService();
    }

    getTeam = async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
            const team = await this.teamService.getTeamById(id);
            if (!team) return res.status(404).json({ message: 'Team not found' });
            return res.json(team);
        } catch (error) {
            return res.status(500).json({ message: 'Error fetching team' });
        }
    };

    getTeams = async (req: Request, res: Response) => {
        try {
            const { page = '0', size = '10', name, region, scheduleType } = req.query as any;
            const result = await this.teamService.getTeams({
                page: parseInt(page),
                size: parseInt(size),
                name,
                region,
                scheduleType
            });
            return res.json(result);
        } catch (error) {
            return res.status(500).json({ message: 'Error fetching teams' });
        }
    };

    createTeam = async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
            const { name, region, scheduleType, location } = req.body;
            if (!name || !region) return res.status(400).json({ message: 'name and region are required' });
            const team = await this.teamService.createTeam({ name, region, scheduleType, location }, req.user.accountId);
            return res.status(201).json(team);
        } catch (error: any) {
            return res.status(500).json({ message: error.message || 'Error creating team' });
        }
    };

    generateInviteLink = async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
            const { teamName, region } = req.body;

            const team = await this.teamService.getTeams({ name: teamName, region });
            if (!team.content.length) return res.status(404).json({ message: 'Team not found' });

            const result = await this.teamService.generateInviteLink(team.content[0].id);
            return res.json(result);
        } catch (error: any) {
            return res.status(500).json({ message: error.message || 'Error generating invite link' });
        }
    };

    joinByInvite = async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
            const { hash } = req.params;
            const result = await this.teamService.joinByInviteHash(hash, req.user.accountId);
            return res.json(result);
        } catch (error: any) {
            const status = error.message.includes('Invalid') ? 400 : error.message.includes('Already') ? 409 : 500;
            return res.status(status).json({ message: error.message });
        }
    };

    getTeamMembers = async (req: Request, res: Response) => {
        try {
            const teamId = parseInt(req.params.teamId);
            if (isNaN(teamId)) return res.status(400).json({ message: 'Invalid team ID' });
            const { page = '0', size = '10', name, email, status } = req.query as any;
            const result = await this.teamService.getTeamMembers(teamId, {
                page: parseInt(page),
                size: parseInt(size),
                name,
                email,
                status
            });
            return res.json(result);
        } catch (error) {
            return res.status(500).json({ message: 'Error fetching team members' });
        }
    };

    approveJoinRequest = async (req: Request, res: Response) => {
        try {
            const teamId = parseInt(req.params.teamId);
            const requestId = parseInt(req.params.requestId);
            if (isNaN(teamId) || isNaN(requestId)) return res.status(400).json({ message: 'Invalid ID' });
            const result = await this.teamService.approveJoinRequest(teamId, requestId);
            return res.json(result);
        } catch (error: any) {
            const status = error.message === 'Join request not found' ? 404 : 500;
            return res.status(status).json({ message: error.message });
        }
    };

    getScheduleConfig = async (req: Request, res: Response) => {
        try {
            const teamId = parseInt(req.params.teamId);
            if (isNaN(teamId)) return res.status(400).json({ message: 'Invalid team ID' });
            const config = await this.teamService.getScheduleConfig(teamId);
            return res.json(config);
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    };

    saveScheduleConfig = async (req: Request, res: Response) => {
        try {
            const teamId = parseInt(req.params.teamId);
            if (isNaN(teamId)) return res.status(400).json({ message: 'Invalid team ID' });
            const result = await this.teamService.saveScheduleConfig(teamId, req.body);
            return res.json(result);
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    };
}
