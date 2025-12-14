import { Request, Response } from 'express';
import { TeamService } from '../services/TeamService';

export class TeamController {
    private teamService: TeamService;

    constructor() {
        this.teamService = new TeamService();
    }

    getTeam = async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID' });
            }
            const team = await this.teamService.getTeamById(id);
            if (!team) {
                return res.status(404).json({ message: 'Team not found' });
            }
            // Handle BigInt serialization if necessary (Prisma handles it if mapped to Int now)
            return res.json(team);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error fetching team' });
        }
    };
}
