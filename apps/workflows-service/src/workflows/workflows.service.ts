import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Workflow } from './entities/workflow.entity';
import { Repository } from 'typeorm';
import { CreateWorkflowDto, UpdateWorkflowDto } from '@app/workflows';

@Injectable()
export class WorkflowsService {

  constructor(
    @InjectRepository(Workflow)
    private readonly workflowsRepository: Repository<Workflow>
  ) {}

  async create(createWorkflowDto: CreateWorkflowDto) {
    const workflow = this.workflowsRepository.create({
      ...createWorkflowDto
    });
    const newWorkflowEntity = await this.workflowsRepository.save(workflow);
    return newWorkflowEntity;
  }

  findAll() {
    return this.workflowsRepository.find();
  }

  async findOne(id: number) {
    const workflow = await this.workflowsRepository.findOne({where: {id}});
    if (!workflow) {
      throw new NotFoundException(`Workflow #${id} does not exist`);
    }
    return workflow;
  }

  async update(id: number, updateWorkflowDto: UpdateWorkflowDto) {
    const workflow = await this.workflowsRepository.preload({
      id: +id,
      ...updateWorkflowDto
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow #${id} does not exist`);
    }
    return this.workflowsRepository.save(workflow);
  }

  async remove(id: number) {
    const workflow = await this.findOne(id);
    return this.workflowsRepository.remove(workflow);
  }
}
