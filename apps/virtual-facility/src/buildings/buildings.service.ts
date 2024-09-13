import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Building } from './entities/building.entity';
import { DataSource, Repository } from 'typeorm';
import { WORKFLOWS_SERVICE } from '../constants';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { CreateWorkflowDto } from '@app/workflows';
import { Outbox } from '@app/outbox/entities/outbox.entity';

@Injectable()
export class BuildingsService {

  constructor(
    @InjectRepository(Building)
    private readonly buildingsRepository: Repository<Building>,
    @Inject(WORKFLOWS_SERVICE)
    private readonly workflowsService: ClientProxy,
    private readonly dataSource: DataSource
  ) {}

  async create(createBuildingDto: CreateBuildingDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const buildingsRepository = queryRunner.manager.getRepository(Building);
    const outboxRepository = queryRunner.manager.getRepository(Outbox);

    try {
      const building = buildingsRepository.create({
        ...createBuildingDto
      });
      const newBuildingEntity = await buildingsRepository.save(building);
  
      await outboxRepository.save({
        type: 'workflows.create',
        payload: {
          name: 'My workflow',
          buildingId: building.id
        },
        target: WORKFLOWS_SERVICE.description
      });

      await queryRunner.commitTransaction();
      
      return newBuildingEntity;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
