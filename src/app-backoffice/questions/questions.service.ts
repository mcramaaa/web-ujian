import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IPaginationOptions } from 'src/shared/types/pagination-options';
import { CreateQuestionDto } from './dto/create-question.dto';
import { Questions } from 'src/database/entities/question.entity';
import { ExamPackage } from 'src/database/entities/exam-package.entity';
import { TQuestionsFilter } from 'src/shared/types/dataType/questions-filter.types';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Questions)
    private readonly questionsRepository: Repository<Questions>,
    @InjectRepository(ExamPackage)
    private readonly examPackageRepository: Repository<ExamPackage>,
  ) {}

  async findManyWithPagination(
    paginationOptions: IPaginationOptions,
    filter: TQuestionsFilter,
  ): Promise<[Questions[], number]> {
    const exam = await this.questionsRepository.findAndCount({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      where: {
        exam_Package: {
          id: filter.examPackage ? filter.examPackage : undefined,
        },
      },
      relations: { exam_Package: true },
    });
    if (!exam) {
      throw new NotFoundException('Cant find participants');
    }

    return exam;
  }

  findOne(id: number) {
    return `This action returns a #${id} question`;
  }

  async create(payload: CreateQuestionDto[], imgs: Express.Multer.File[]) {
    const createdQuestions = [];
    const imgMap = new Map();
    if (imgs) {
      imgs.forEach((file, index) => {
        imgMap.set(index, file.filename);
      });
    }

    const processedData = payload.map((questionDto: any) => ({
      ...questionDto,
      options: `${JSON.parse(questionDto.options.replace(/'/g, '"'))}`,
    }));

    for (const questionDto of processedData) {
      const examPackage = await this.examPackageRepository.findOne({
        where: { id: questionDto.package_id },
      });
      if (!examPackage) {
        throw new NotFoundException('ExamPackage not found');
      }

      const imgFilename = imgMap.get(createdQuestions.length) || ''; // Get the corresponding image or empty string if not found

      const question = this.questionsRepository.create({
        question: questionDto.question,
        options: questionDto.options, // Assign parsed array to 'options'
        answer: questionDto.answer,
        onTrue: questionDto.onTrue,
        onEmpty: questionDto.onEmpty,
        onFalse: questionDto.onFalse,
        type: questionDto.type,
        img: imgFilename,
        exam_Package: examPackage,
        audit_trail: {
          created_at: new Date(),
          created_by: 'System', // Adjust according to actual information
          updated_at: new Date(),
          updated_by: 'System', // Adjust according to actual information
        },
      });

      createdQuestions.push(question);
    }

    return this.questionsRepository.save(createdQuestions);
  }

  remove(id: number) {
    return `This action removes a #${id} question`;
  }
}
