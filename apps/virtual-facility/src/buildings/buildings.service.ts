import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Building } from './entities/building.entity';
import { Repository } from 'typeorm';
import { WORKFLOWS_SERVICE } from '../constants';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { CreateWorkflowDto } from '@app/workflows';

@Injectable()
export class BuildingsService {

  constructor(
    @InjectRepository(Building)
    private readonly buildingsRepository: Repository<Building>,
    @Inject(WORKFLOWS_SERVICE)
    private readonly workflowsService: ClientProxy
  ) {}

  async create(createBuildingDto: CreateBuildingDto) {
    const building = this.buildingsRepository.create({
      ...createBuildingDto
    });
    const newBuildingEntity = await this.buildingsRepository.save(building);

    // create a workflow for the new building
    await this.createWorkflow(newBuildingEntity.id);
    return newBuildingEntity;
  }

  findAll() {
    return this.buildingsRepository.find();
  }

  async findOne(id: number) {
    const building = await this.buildingsRepository.findOne({where: {id}});
    if (!building) {
      throw new NotFoundException(`Building #${id} does not exist`);
    }
    return building;
  }

  async update(id: number, updateBuildingDto: UpdateBuildingDto) {
    const building = await this.buildingsRepository.preload({
      id: +id, 
      ...updateBuildingDto
    });

    if (!building) {
      throw new NotFoundException(`Building #${id} does not exxist`);
    }
    return this.buildingsRepository.save(building);
  }

  async remove(id: number) {
    const building = await this.findOne(id);
    return this.buildingsRepository.remove(building);
  }

  async createWorkflow(buildingId: number) {
    // const response = await fetch('http://workflows-service:3001/workflows', {
    //   method: 'POST',
    //   headers: {'Content-Type': 'application/json'},
    //   body: JSON.stringify({name: 'My Workflow', buildingId}),
    // });
    // const newWorkflow = await response.json();

    const newWorkflow = await lastValueFrom(
      this.workflowsService.send('workflows.create', {
        name: 'My Workflow',
        buildingId,
      } as CreateWorkflowDto)
    );
    
    console.log({newWorkflow});
    return newWorkflow;
  }
}
