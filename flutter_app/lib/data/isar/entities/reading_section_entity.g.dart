// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'reading_section_entity.dart';

// **************************************************************************
// IsarCollectionGenerator
// **************************************************************************

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetReadingSectionEntityCollection on Isar {
  IsarCollection<ReadingSectionEntity> get readingSectionEntitys =>
      this.collection();
}

const ReadingSectionEntitySchema = CollectionSchema(
  name: r'ReadingSection',
  id: -8498277211763496797,
  properties: {
    r'bookId': PropertySchema(
      id: 0,
      name: r'bookId',
      type: IsarType.string,
    ),
    r'createdAt': PropertySchema(
      id: 1,
      name: r'createdAt',
      type: IsarType.dateTime,
    ),
    r'endPage': PropertySchema(
      id: 2,
      name: r'endPage',
      type: IsarType.long,
    ),
    r'isUnlocked': PropertySchema(
      id: 3,
      name: r'isUnlocked',
      type: IsarType.bool,
    ),
    r'masteredWords': PropertySchema(
      id: 4,
      name: r'masteredWords',
      type: IsarType.long,
    ),
    r'practiceCompletedAt': PropertySchema(
      id: 5,
      name: r'practiceCompletedAt',
      type: IsarType.dateTime,
    ),
    r'practiceStartedAt': PropertySchema(
      id: 6,
      name: r'practiceStartedAt',
      type: IsarType.dateTime,
    ),
    r'readingCompletedAt': PropertySchema(
      id: 7,
      name: r'readingCompletedAt',
      type: IsarType.dateTime,
    ),
    r'readingStartedAt': PropertySchema(
      id: 8,
      name: r'readingStartedAt',
      type: IsarType.dateTime,
    ),
    r'recognitionRate': PropertySchema(
      id: 9,
      name: r'recognitionRate',
      type: IsarType.double,
    ),
    r'sectionId': PropertySchema(
      id: 10,
      name: r'sectionId',
      type: IsarType.string,
    ),
    r'sectionNumber': PropertySchema(
      id: 11,
      name: r'sectionNumber',
      type: IsarType.long,
    ),
    r'sectionType': PropertySchema(
      id: 12,
      name: r'sectionType',
      type: IsarType.byte,
      enumMap: _ReadingSectionEntitysectionTypeEnumValueMap,
    ),
    r'startPage': PropertySchema(
      id: 13,
      name: r'startPage',
      type: IsarType.long,
    ),
    r'status': PropertySchema(
      id: 14,
      name: r'status',
      type: IsarType.byte,
      enumMap: _ReadingSectionEntitystatusEnumValueMap,
    ),
    r'totalWords': PropertySchema(
      id: 15,
      name: r'totalWords',
      type: IsarType.long,
    ),
    r'updatedAt': PropertySchema(
      id: 16,
      name: r'updatedAt',
      type: IsarType.dateTime,
    ),
    r'userId': PropertySchema(
      id: 17,
      name: r'userId',
      type: IsarType.string,
    )
  },
  estimateSize: _readingSectionEntityEstimateSize,
  serialize: _readingSectionEntitySerialize,
  deserialize: _readingSectionEntityDeserialize,
  deserializeProp: _readingSectionEntityDeserializeProp,
  idName: r'id',
  indexes: {
    r'sectionId': IndexSchema(
      id: 2871565378294445407,
      name: r'sectionId',
      unique: false,
      replace: false,
      properties: [
        IndexPropertySchema(
          name: r'sectionId',
          type: IndexType.hash,
          caseSensitive: true,
        )
      ],
    ),
    r'bookId': IndexSchema(
      id: 3567540928881766442,
      name: r'bookId',
      unique: false,
      replace: false,
      properties: [
        IndexPropertySchema(
          name: r'bookId',
          type: IndexType.hash,
          caseSensitive: true,
        )
      ],
    )
  },
  links: {},
  embeddedSchemas: {},
  getId: _readingSectionEntityGetId,
  getLinks: _readingSectionEntityGetLinks,
  attach: _readingSectionEntityAttach,
  version: '3.1.0+1',
);

int _readingSectionEntityEstimateSize(
  ReadingSectionEntity object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.bookId.length * 3;
  bytesCount += 3 + object.sectionId.length * 3;
  bytesCount += 3 + object.userId.length * 3;
  return bytesCount;
}

void _readingSectionEntitySerialize(
  ReadingSectionEntity object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeString(offsets[0], object.bookId);
  writer.writeDateTime(offsets[1], object.createdAt);
  writer.writeLong(offsets[2], object.endPage);
  writer.writeBool(offsets[3], object.isUnlocked);
  writer.writeLong(offsets[4], object.masteredWords);
  writer.writeDateTime(offsets[5], object.practiceCompletedAt);
  writer.writeDateTime(offsets[6], object.practiceStartedAt);
  writer.writeDateTime(offsets[7], object.readingCompletedAt);
  writer.writeDateTime(offsets[8], object.readingStartedAt);
  writer.writeDouble(offsets[9], object.recognitionRate);
  writer.writeString(offsets[10], object.sectionId);
  writer.writeLong(offsets[11], object.sectionNumber);
  writer.writeByte(offsets[12], object.sectionType.index);
  writer.writeLong(offsets[13], object.startPage);
  writer.writeByte(offsets[14], object.status.index);
  writer.writeLong(offsets[15], object.totalWords);
  writer.writeDateTime(offsets[16], object.updatedAt);
  writer.writeString(offsets[17], object.userId);
}

ReadingSectionEntity _readingSectionEntityDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = ReadingSectionEntity();
  object.bookId = reader.readString(offsets[0]);
  object.createdAt = reader.readDateTime(offsets[1]);
  object.endPage = reader.readLong(offsets[2]);
  object.id = id;
  object.isUnlocked = reader.readBool(offsets[3]);
  object.masteredWords = reader.readLong(offsets[4]);
  object.practiceCompletedAt = reader.readDateTimeOrNull(offsets[5]);
  object.practiceStartedAt = reader.readDateTimeOrNull(offsets[6]);
  object.readingCompletedAt = reader.readDateTimeOrNull(offsets[7]);
  object.readingStartedAt = reader.readDateTimeOrNull(offsets[8]);
  object.recognitionRate = reader.readDouble(offsets[9]);
  object.sectionId = reader.readString(offsets[10]);
  object.sectionNumber = reader.readLong(offsets[11]);
  object.sectionType = _ReadingSectionEntitysectionTypeValueEnumMap[
          reader.readByteOrNull(offsets[12])] ??
      SectionType.pages;
  object.startPage = reader.readLong(offsets[13]);
  object.status = _ReadingSectionEntitystatusValueEnumMap[
          reader.readByteOrNull(offsets[14])] ??
      SectionStatus.locked;
  object.totalWords = reader.readLong(offsets[15]);
  object.updatedAt = reader.readDateTime(offsets[16]);
  object.userId = reader.readString(offsets[17]);
  return object;
}

P _readingSectionEntityDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readString(offset)) as P;
    case 1:
      return (reader.readDateTime(offset)) as P;
    case 2:
      return (reader.readLong(offset)) as P;
    case 3:
      return (reader.readBool(offset)) as P;
    case 4:
      return (reader.readLong(offset)) as P;
    case 5:
      return (reader.readDateTimeOrNull(offset)) as P;
    case 6:
      return (reader.readDateTimeOrNull(offset)) as P;
    case 7:
      return (reader.readDateTimeOrNull(offset)) as P;
    case 8:
      return (reader.readDateTimeOrNull(offset)) as P;
    case 9:
      return (reader.readDouble(offset)) as P;
    case 10:
      return (reader.readString(offset)) as P;
    case 11:
      return (reader.readLong(offset)) as P;
    case 12:
      return (_ReadingSectionEntitysectionTypeValueEnumMap[
              reader.readByteOrNull(offset)] ??
          SectionType.pages) as P;
    case 13:
      return (reader.readLong(offset)) as P;
    case 14:
      return (_ReadingSectionEntitystatusValueEnumMap[
              reader.readByteOrNull(offset)] ??
          SectionStatus.locked) as P;
    case 15:
      return (reader.readLong(offset)) as P;
    case 16:
      return (reader.readDateTime(offset)) as P;
    case 17:
      return (reader.readString(offset)) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

const _ReadingSectionEntitysectionTypeEnumValueMap = {
  'pages': 0,
  'chapters': 1,
  'wordCount': 2,
};
const _ReadingSectionEntitysectionTypeValueEnumMap = {
  0: SectionType.pages,
  1: SectionType.chapters,
  2: SectionType.wordCount,
};
const _ReadingSectionEntitystatusEnumValueMap = {
  'locked': 0,
  'readyToPractice': 1,
  'practicing': 2,
  'readyToRead': 3,
  'reading': 4,
  'completed': 5,
};
const _ReadingSectionEntitystatusValueEnumMap = {
  0: SectionStatus.locked,
  1: SectionStatus.readyToPractice,
  2: SectionStatus.practicing,
  3: SectionStatus.readyToRead,
  4: SectionStatus.reading,
  5: SectionStatus.completed,
};

Id _readingSectionEntityGetId(ReadingSectionEntity object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _readingSectionEntityGetLinks(
    ReadingSectionEntity object) {
  return [];
}

void _readingSectionEntityAttach(
    IsarCollection<dynamic> col, Id id, ReadingSectionEntity object) {
  object.id = id;
}

extension ReadingSectionEntityQueryWhereSort
    on QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QWhere> {
  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterWhere>
      anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension ReadingSectionEntityQueryWhere
    on QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QWhereClause> {
  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterWhereClause>
      idEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterWhereClause>
      idNotEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterWhereClause>
      idGreaterThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterWhereClause>
      idLessThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterWhereClause>
      idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: lowerId,
        includeLower: includeLower,
        upper: upperId,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterWhereClause>
      sectionIdEqualTo(String sectionId) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.equalTo(
        indexName: r'sectionId',
        value: [sectionId],
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterWhereClause>
      sectionIdNotEqualTo(String sectionId) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'sectionId',
              lower: [],
              upper: [sectionId],
              includeUpper: false,
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'sectionId',
              lower: [sectionId],
              includeLower: false,
              upper: [],
            ));
      } else {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'sectionId',
              lower: [sectionId],
              includeLower: false,
              upper: [],
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'sectionId',
              lower: [],
              upper: [sectionId],
              includeUpper: false,
            ));
      }
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterWhereClause>
      bookIdEqualTo(String bookId) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.equalTo(
        indexName: r'bookId',
        value: [bookId],
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterWhereClause>
      bookIdNotEqualTo(String bookId) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'bookId',
              lower: [],
              upper: [bookId],
              includeUpper: false,
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'bookId',
              lower: [bookId],
              includeLower: false,
              upper: [],
            ));
      } else {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'bookId',
              lower: [bookId],
              includeLower: false,
              upper: [],
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'bookId',
              lower: [],
              upper: [bookId],
              includeUpper: false,
            ));
      }
    });
  }
}

extension ReadingSectionEntityQueryFilter on QueryBuilder<ReadingSectionEntity,
    ReadingSectionEntity, QFilterCondition> {
  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> bookIdEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> bookIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> bookIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> bookIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'bookId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> bookIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> bookIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
          QAfterFilterCondition>
      bookIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'bookId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
          QAfterFilterCondition>
      bookIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'bookId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> bookIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'bookId',
        value: '',
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> bookIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'bookId',
        value: '',
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> createdAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> createdAtGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> createdAtLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> createdAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'createdAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> endPageEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'endPage',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> endPageGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'endPage',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> endPageLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'endPage',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> endPageBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'endPage',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> idEqualTo(Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> idGreaterThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> idLessThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'id',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> isUnlockedEqualTo(bool value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'isUnlocked',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> masteredWordsEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'masteredWords',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> masteredWordsGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'masteredWords',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> masteredWordsLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'masteredWords',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> masteredWordsBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'masteredWords',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> practiceCompletedAtIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'practiceCompletedAt',
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> practiceCompletedAtIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'practiceCompletedAt',
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> practiceCompletedAtEqualTo(DateTime? value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'practiceCompletedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> practiceCompletedAtGreaterThan(
    DateTime? value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'practiceCompletedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> practiceCompletedAtLessThan(
    DateTime? value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'practiceCompletedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> practiceCompletedAtBetween(
    DateTime? lower,
    DateTime? upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'practiceCompletedAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> practiceStartedAtIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'practiceStartedAt',
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> practiceStartedAtIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'practiceStartedAt',
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> practiceStartedAtEqualTo(DateTime? value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'practiceStartedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> practiceStartedAtGreaterThan(
    DateTime? value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'practiceStartedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> practiceStartedAtLessThan(
    DateTime? value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'practiceStartedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> practiceStartedAtBetween(
    DateTime? lower,
    DateTime? upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'practiceStartedAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> readingCompletedAtIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'readingCompletedAt',
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> readingCompletedAtIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'readingCompletedAt',
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> readingCompletedAtEqualTo(DateTime? value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'readingCompletedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> readingCompletedAtGreaterThan(
    DateTime? value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'readingCompletedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> readingCompletedAtLessThan(
    DateTime? value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'readingCompletedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> readingCompletedAtBetween(
    DateTime? lower,
    DateTime? upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'readingCompletedAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> readingStartedAtIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'readingStartedAt',
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> readingStartedAtIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'readingStartedAt',
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> readingStartedAtEqualTo(DateTime? value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'readingStartedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> readingStartedAtGreaterThan(
    DateTime? value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'readingStartedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> readingStartedAtLessThan(
    DateTime? value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'readingStartedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> readingStartedAtBetween(
    DateTime? lower,
    DateTime? upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'readingStartedAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> recognitionRateEqualTo(
    double value, {
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'recognitionRate',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> recognitionRateGreaterThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'recognitionRate',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> recognitionRateLessThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'recognitionRate',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> recognitionRateBetween(
    double lower,
    double upper, {
    bool includeLower = true,
    bool includeUpper = true,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'recognitionRate',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> sectionIdEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'sectionId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> sectionIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'sectionId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> sectionIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'sectionId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> sectionIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'sectionId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> sectionIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'sectionId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> sectionIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'sectionId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
          QAfterFilterCondition>
      sectionIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'sectionId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
          QAfterFilterCondition>
      sectionIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'sectionId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> sectionIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'sectionId',
        value: '',
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> sectionIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'sectionId',
        value: '',
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> sectionNumberEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'sectionNumber',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> sectionNumberGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'sectionNumber',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> sectionNumberLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'sectionNumber',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> sectionNumberBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'sectionNumber',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> sectionTypeEqualTo(SectionType value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'sectionType',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> sectionTypeGreaterThan(
    SectionType value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'sectionType',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> sectionTypeLessThan(
    SectionType value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'sectionType',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> sectionTypeBetween(
    SectionType lower,
    SectionType upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'sectionType',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> startPageEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'startPage',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> startPageGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'startPage',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> startPageLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'startPage',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> startPageBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'startPage',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> statusEqualTo(SectionStatus value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'status',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> statusGreaterThan(
    SectionStatus value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'status',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> statusLessThan(
    SectionStatus value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'status',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> statusBetween(
    SectionStatus lower,
    SectionStatus upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'status',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> totalWordsEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'totalWords',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> totalWordsGreaterThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'totalWords',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> totalWordsLessThan(
    int value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'totalWords',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> totalWordsBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'totalWords',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> updatedAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> updatedAtGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> updatedAtLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> updatedAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'updatedAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> userIdEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> userIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> userIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> userIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'userId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> userIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> userIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
          QAfterFilterCondition>
      userIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
          QAfterFilterCondition>
      userIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'userId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> userIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'userId',
        value: '',
      ));
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity,
      QAfterFilterCondition> userIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'userId',
        value: '',
      ));
    });
  }
}

extension ReadingSectionEntityQueryObject on QueryBuilder<ReadingSectionEntity,
    ReadingSectionEntity, QFilterCondition> {}

extension ReadingSectionEntityQueryLinks on QueryBuilder<ReadingSectionEntity,
    ReadingSectionEntity, QFilterCondition> {}

extension ReadingSectionEntityQuerySortBy
    on QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QSortBy> {
  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByBookId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'bookId', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByBookIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'bookId', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByCreatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByEndPage() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'endPage', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByEndPageDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'endPage', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByIsUnlocked() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'isUnlocked', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByIsUnlockedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'isUnlocked', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByMasteredWords() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'masteredWords', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByMasteredWordsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'masteredWords', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByPracticeCompletedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'practiceCompletedAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByPracticeCompletedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'practiceCompletedAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByPracticeStartedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'practiceStartedAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByPracticeStartedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'practiceStartedAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByReadingCompletedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'readingCompletedAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByReadingCompletedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'readingCompletedAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByReadingStartedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'readingStartedAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByReadingStartedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'readingStartedAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByRecognitionRate() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'recognitionRate', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByRecognitionRateDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'recognitionRate', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortBySectionId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionId', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortBySectionIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionId', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortBySectionNumber() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionNumber', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortBySectionNumberDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionNumber', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortBySectionType() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionType', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortBySectionTypeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionType', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByStartPage() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'startPage', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByStartPageDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'startPage', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByStatus() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'status', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByStatusDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'status', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByTotalWords() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalWords', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByTotalWordsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalWords', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByUpdatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByUserId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      sortByUserIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.desc);
    });
  }
}

extension ReadingSectionEntityQuerySortThenBy
    on QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QSortThenBy> {
  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByBookId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'bookId', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByBookIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'bookId', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByCreatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByEndPage() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'endPage', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByEndPageDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'endPage', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByIsUnlocked() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'isUnlocked', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByIsUnlockedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'isUnlocked', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByMasteredWords() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'masteredWords', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByMasteredWordsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'masteredWords', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByPracticeCompletedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'practiceCompletedAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByPracticeCompletedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'practiceCompletedAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByPracticeStartedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'practiceStartedAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByPracticeStartedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'practiceStartedAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByReadingCompletedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'readingCompletedAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByReadingCompletedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'readingCompletedAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByReadingStartedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'readingStartedAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByReadingStartedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'readingStartedAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByRecognitionRate() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'recognitionRate', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByRecognitionRateDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'recognitionRate', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenBySectionId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionId', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenBySectionIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionId', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenBySectionNumber() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionNumber', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenBySectionNumberDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionNumber', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenBySectionType() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionType', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenBySectionTypeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sectionType', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByStartPage() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'startPage', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByStartPageDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'startPage', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByStatus() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'status', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByStatusDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'status', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByTotalWords() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalWords', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByTotalWordsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'totalWords', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByUpdatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.desc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByUserId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.asc);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QAfterSortBy>
      thenByUserIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.desc);
    });
  }
}

extension ReadingSectionEntityQueryWhereDistinct
    on QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct> {
  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctByBookId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'bookId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'createdAt');
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctByEndPage() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'endPage');
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctByIsUnlocked() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'isUnlocked');
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctByMasteredWords() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'masteredWords');
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctByPracticeCompletedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'practiceCompletedAt');
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctByPracticeStartedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'practiceStartedAt');
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctByReadingCompletedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'readingCompletedAt');
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctByReadingStartedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'readingStartedAt');
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctByRecognitionRate() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'recognitionRate');
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctBySectionId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'sectionId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctBySectionNumber() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'sectionNumber');
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctBySectionType() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'sectionType');
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctByStartPage() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'startPage');
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctByStatus() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'status');
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctByTotalWords() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'totalWords');
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'updatedAt');
    });
  }

  QueryBuilder<ReadingSectionEntity, ReadingSectionEntity, QDistinct>
      distinctByUserId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'userId', caseSensitive: caseSensitive);
    });
  }
}

extension ReadingSectionEntityQueryProperty on QueryBuilder<
    ReadingSectionEntity, ReadingSectionEntity, QQueryProperty> {
  QueryBuilder<ReadingSectionEntity, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<ReadingSectionEntity, String, QQueryOperations>
      bookIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'bookId');
    });
  }

  QueryBuilder<ReadingSectionEntity, DateTime, QQueryOperations>
      createdAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'createdAt');
    });
  }

  QueryBuilder<ReadingSectionEntity, int, QQueryOperations> endPageProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'endPage');
    });
  }

  QueryBuilder<ReadingSectionEntity, bool, QQueryOperations>
      isUnlockedProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'isUnlocked');
    });
  }

  QueryBuilder<ReadingSectionEntity, int, QQueryOperations>
      masteredWordsProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'masteredWords');
    });
  }

  QueryBuilder<ReadingSectionEntity, DateTime?, QQueryOperations>
      practiceCompletedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'practiceCompletedAt');
    });
  }

  QueryBuilder<ReadingSectionEntity, DateTime?, QQueryOperations>
      practiceStartedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'practiceStartedAt');
    });
  }

  QueryBuilder<ReadingSectionEntity, DateTime?, QQueryOperations>
      readingCompletedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'readingCompletedAt');
    });
  }

  QueryBuilder<ReadingSectionEntity, DateTime?, QQueryOperations>
      readingStartedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'readingStartedAt');
    });
  }

  QueryBuilder<ReadingSectionEntity, double, QQueryOperations>
      recognitionRateProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'recognitionRate');
    });
  }

  QueryBuilder<ReadingSectionEntity, String, QQueryOperations>
      sectionIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'sectionId');
    });
  }

  QueryBuilder<ReadingSectionEntity, int, QQueryOperations>
      sectionNumberProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'sectionNumber');
    });
  }

  QueryBuilder<ReadingSectionEntity, SectionType, QQueryOperations>
      sectionTypeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'sectionType');
    });
  }

  QueryBuilder<ReadingSectionEntity, int, QQueryOperations>
      startPageProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'startPage');
    });
  }

  QueryBuilder<ReadingSectionEntity, SectionStatus, QQueryOperations>
      statusProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'status');
    });
  }

  QueryBuilder<ReadingSectionEntity, int, QQueryOperations>
      totalWordsProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'totalWords');
    });
  }

  QueryBuilder<ReadingSectionEntity, DateTime, QQueryOperations>
      updatedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'updatedAt');
    });
  }

  QueryBuilder<ReadingSectionEntity, String, QQueryOperations>
      userIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'userId');
    });
  }
}
